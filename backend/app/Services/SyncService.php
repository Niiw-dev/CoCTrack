<?php

namespace App\Services;

use App\Clients\CocClient;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class SyncService
{
    public function __construct(private CocClient $coc) {}

    public function canSync(int $cooldownMinutes = 10): array
    {
        $last = Cache::get('last_sync_at');
        if (!$last) return ['allowed'=>true,'wait'=>0];
        // file cache puede devolver __PHP_Incomplete_Class (Carbon serializado)
        if (is_object($last) && get_class($last) === '__PHP_Incomplete_Class') {
            Cache::forget('last_sync_at');
            return ['allowed'=>true,'wait'=>0];
        }
        try {
            $lastAt = $last instanceof \Carbon\CarbonInterface ? $last : \Carbon\Carbon::parse($last);
        } catch (\Throwable $e) {
            Cache::forget('last_sync_at');
            return ['allowed'=>true,'wait'=>0];
        }
        // Carbon 3: diffInMinutes sin segundo parámetro es signed; usamos absoluto
        $elapsedSeconds = $lastAt->diffInSeconds(now(), true);
        $elapsed = $elapsedSeconds / 60.0;
        if ($elapsed < $cooldownMinutes) {
            $wait = (int) ceil($cooldownMinutes - $elapsed);
            return ['allowed'=>false,'wait'=> $wait];
        }
        return ['allowed'=>true,'wait'=>0];
    }

    public function sync(string $clanTag): array
    {
        $check = $this->canSync();
        if (!$check['allowed']) {
            return ['status'=>'throttled','wait_minutes'=>$check['wait'],'message'=>"Espera {$check['wait']}m entre sincronizaciones"];
        }

        $started = now();
        DB::beginTransaction();
        try {
            $clan = $this->coc->getClan($clanTag);
            $members = $this->coc->getMembers($clanTag);
            $playerTags = array_column($members, 'tag');
            $players = $this->coc->getPlayersBulk($playerTags);
            $currentWar = $this->coc->getCurrentWar($clanTag);
            $warLog = $this->coc->getWarLog($clanTag, 20);
            $capital = $this->coc->getCapitalSeasons($clanTag, 5);
            $leagueGroup = $this->coc->getLeagueGroup($clanTag);

            // --- Persist wars (warLog) ---
            $warsInserted = 0;
            foreach (($warLog['items'] ?? []) as $w) {
                try {
                    $endTime = isset($w['endTime']) ? (\Carbon\Carbon::createFromFormat('Ymd\THis.v\Z', $w['endTime']) ?: \Carbon\Carbon::parse($w['endTime'])) : null;
                    if (!$endTime) continue;
                    $existing = DB::table('wars')->where('end_time', $endTime)->first();
                    if (!$existing) {
                        DB::table('wars')->insert([
                            'clan_tag' => $clanTag,
                            'end_time' => $endTime,
                            'state' => 'warEnded',
                            'result' => $w['result'] ?? null,
                            'team_size' => $w['teamSize'] ?? 15,
                            'attacks_per_member' => $w['attacksPerMember'] ?? 1,
                            'raw_json' => json_encode($w),
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                        $warsInserted++;
                    }
                } catch (\Throwable $e) { Log::warning('persist warLog failed', ['err'=>$e->getMessage(), 'war'=>$w]); }
            }

            // --- Persist currentWar: captura roster y ataques antes de que termine ---
            if (isset($currentWar['state']) && in_array($currentWar['state'], ['preparation','inWar','warEnded'])) {
                try {
                    $endTime = isset($currentWar['endTime']) ? (\Carbon\Carbon::createFromFormat('Ymd\THis.v\Z', $currentWar['endTime']) ?: \Carbon\Carbon::parse($currentWar['endTime'])) : null;
                    if ($endTime) {
                        $existing = DB::table('wars')->where('end_time', $endTime)->first();
                        if (!$existing) {
                            $warId = DB::table('wars')->insertGetId([
                                'clan_tag'=>$clanTag,
                                'end_time'=>$endTime,
                                'state'=>$currentWar['state'],
                                'team_size'=>$currentWar['teamSize'] ?? 15,
                                'attacks_per_member'=>$currentWar['attacksPerMember'] ?? 1,
                                'raw_json'=>json_encode($currentWar),
                                'created_at'=>now(),'updated_at'=>now(),
                            ]);
                        } else {
                            $warId = $existing->id;
                            DB::table('wars')->where('id',$warId)->update([
                                'state'=>$currentWar['state'],
                                'team_size'=>$currentWar['teamSize'] ?? $existing->team_size,
                                'raw_json'=>json_encode($currentWar),
                                'updated_at'=>now(),
                            ]);
                        }
                        // upsert participaciones en cada sync (preparation->inWar->warEnded se actualiza)
                        foreach (($currentWar['clan']['members'] ?? []) as $cm) {
                            DB::table('war_participations')->updateOrInsert(
                                ['war_id'=>$warId, 'player_tag'=>$cm['tag']],
                                [
                                    'attacks_done'=> count($cm['attacks'] ?? []),
                                    'attacks_expected'=> $currentWar['attacksPerMember'] ?? 1,
                                    'stars'=> array_sum(array_column($cm['attacks'] ?? [], 'stars')),
                                    'destruction'=> count($cm['attacks'] ?? []) ? array_sum(array_column($cm['attacks'], 'destructionPercentage'))/count($cm['attacks']) : 0,
                                    'incumplio'=> (count($cm['attacks'] ?? []) < ($currentWar['attacksPerMember'] ?? 1)) && $currentWar['state']==='warEnded',
                                    'updated_at'=>now(),'created_at'=>now(),
                                ]
                            );
                        }
                    }
                } catch (\Throwable $e) { Log::warning('persist currentWar failed', ['err'=>$e->getMessage()]); }
            }

            // --- Persist capital seasons ---
            $capitalInserted = 0;
            foreach (($capital['items'] ?? []) as $cs) {
                try {
                    $start = isset($cs['startTime']) ? (\Carbon\Carbon::createFromFormat('Ymd\THis.v\Z', $cs['startTime']) ?: \Carbon\Carbon::parse($cs['startTime'])) : null;
                    $end = isset($cs['endTime']) ? (\Carbon\Carbon::createFromFormat('Ymd\THis.v\Z', $cs['endTime']) ?: \Carbon\Carbon::parse($cs['endTime'])) : null;
                    if (!$start) continue;
                    $season = DB::table('capital_seasons')->where('start_time', $start)->first();
                    if (!$season) {
                        $seasonId = DB::table('capital_seasons')->insertGetId([
                            'start_time'=>$start,
                            'end_time'=>$end,
                            'state'=>$cs['state'] ?? null,
                            'total_attacks'=> isset($cs['members']) ? count($cs['members'])*5 : 0,
                            'raw_json'=>json_encode($cs),
                            'created_at'=>now(),'updated_at'=>now(),
                        ]);
                        $capitalInserted++;
                    } else { $seasonId = $season->id; }
                    foreach (($cs['members'] ?? []) as $m) {
                        DB::table('capital_participations')->updateOrInsert(
                            ['season_id'=>$seasonId, 'player_tag'=>$m['tag'] ?? $m['name']],
                            [
                                'attacks'=>$m['attacks'] ?? 0,
                                'attack_limit'=>5,
                                'capital_resources_looted'=>$m['capitalResourcesLooted'] ?? 0,
                                'cumplio'=> ($m['attacks'] ?? 0) >=5,
                                'updated_at'=>now(),'created_at'=>now(),
                            ]
                        );
                    }
                } catch (\Throwable $e) { Log::warning('persist capital failed', ['err'=>$e->getMessage()]); }
            }

            // --- Persist CWL + cwl_participations ---
            $cwlInserted = 0;
            if (!empty($leagueGroup) && isset($leagueGroup['tag'])) {
                try {
                    $g = DB::table('cwl_groups')->where('tag', $leagueGroup['tag'])->first();
                    if (!$g) {
                        $gid = DB::table('cwl_groups')->insertGetId([
                            'tag'=>$leagueGroup['tag'],
                            'state'=>$leagueGroup['state'] ?? null,
                            'raw_json'=>json_encode($leagueGroup),
                            'created_at'=>now(),'updated_at'=>now(),
                        ]);
                    } else { $gid = $g->id; }
                    foreach (($leagueGroup['rounds'] ?? []) as $round) {
                        foreach (($round['warTags'] ?? []) as $wt) {
                            if ($wt === '#0') continue;
                            try {
                                $war = $this->coc->getCwlWar($wt);
                                $end = isset($war['endTime']) ? (\Carbon\Carbon::createFromFormat('Ymd\THis.v\Z', $war['endTime']) ?: \Carbon\Carbon::parse($war['endTime'])) : null;
                                DB::table('cwl_wars')->updateOrInsert(
                                    ['war_tag'=>$wt],
                                    [
                                        'cwl_group_id'=>$gid,
                                        'state'=>$war['state'] ?? 'unknown',
                                        'end_time'=>$end,
                                        'raw_json'=>json_encode($war),
                                        'updated_at'=>now(),'created_at'=>now(),
                                    ]
                                );
                                $cwlWarId = DB::table('cwl_wars')->where('war_tag',$wt)->value('id');
                                // persist participations CWL (ambos clanes, luego se filtra por member)
                                if ($cwlWarId) {
                                    $allMembers = array_merge($war['clan']['members'] ?? [], $war['opponent']['members'] ?? []);
                                    foreach ($allMembers as $cm) {
                                        if (!isset($cm['tag'])) continue;
                                        DB::table('cwl_participations')->updateOrInsert(
                                            ['cwl_war_id'=>$cwlWarId, 'player_tag'=>$cm['tag']],
                                            [
                                                'attacks_done'=> count($cm['attacks'] ?? []),
                                                'stars'=> array_sum(array_column($cm['attacks'] ?? [], 'stars')),
                                                'destruction'=> count($cm['attacks'] ?? []) ? array_sum(array_column($cm['attacks'], 'destructionPercentage'))/count($cm['attacks']) : 0,
                                                'updated_at'=>now(),'created_at'=>now(),
                                            ]
                                        );
                                    }
                                }
                                $cwlInserted++;
                            } catch (\Throwable $e) { Log::warning('cwl war fetch failed', ['tag'=>$wt, 'err'=>$e->getMessage()]); }
                        }
                    }
                } catch (\Throwable $e) { Log::warning('persist cwl failed', ['err'=>$e->getMessage()]); }
            }

            // Persist snapshot
            $snapshotId = DB::table('clan_snapshots')->insertGetId([
                'clan_tag'=>$clanTag,
                'clan_name'=>$clan['name'] ?? 'unknown',
                'clan_level'=>$clan['clanLevel'] ?? 0,
                'members_count'=>$clan['members'] ?? count($members),
                'raw_json'=>json_encode($clan),
                'synced_at'=>$started,
                'created_at'=>$started,
                'updated_at'=>$started,
            ]);

            foreach ($members as $m) {
                $pPref = $players[$m['tag']]['warPreference'] ?? 'in';
                $pData = $players[$m['tag']] ?? [];
                DB::table('member_snapshots')->insert([
                    'clan_snapshot_id'=>$snapshotId,
                    'player_tag'=>$m['tag'],
                    'player_name'=>$m['name'],
                    'role'=>$m['role'] ?? 'MEMBER',
                    'town_hall'=>$m['townHallLevel'] ?? 0,
                    'trophies'=>$m['trophies'] ?? 0,
                    'donations'=>$m['donations'] ?? 0,
                    'donations_received'=>$m['donationsReceived'] ?? 0,
                    'war_preference'=>$pPref,
                    'war_stars'=>$pData['warStars'] ?? 0,
                    'attack_wins'=>$pData['attackWins'] ?? 0,
                    'exp_level'=>$pData['expLevel'] ?? 0,
                    'capital_contributions'=>$pData['clanCapitalContributions'] ?? 0,
                    'created_at'=>$started,
                    'updated_at'=>$started,
                ]);
            }

            // --- RuleEngine: generar warnings/alerts ---
            $engine = new \App\Services\RuleEngine();
            $alertsInserted = 0; $warningsInserted = 0;
            // última season capital y juegos para ctx
            $lastSeason = DB::table('capital_seasons')->orderByDesc('start_time')->first();
            $lastGameSeason = null;
            if (Schema::hasTable('clan_game_seasons')) {
                $lastGameSeason = DB::table('clan_game_seasons')->orderByDesc('start_time')->first();
            }
            foreach ($members as $m) {
                $pTag = $m['tag'];
                $pData = $players[$pTag] ?? ['name'=>$m['name']];
                // capital ctx para este jugador
                $capCtx = null;
                if ($lastSeason) {
                    $cp = DB::table('capital_participations')->where('season_id',$lastSeason->id)->where('player_tag',$pTag)->first();
                    if ($cp) $capCtx = ['attacks'=>$cp->attacks];
                    else $capCtx = ['attacks'=>0]; // no participó = 0/5
                }
                // juegos ctx para este jugador (última temporada)
                $gameCtx = null;
                if ($lastGameSeason) {
                    $gp = DB::table('clan_game_participations')->where('season_id',$lastGameSeason->id)->where('player_tag',$pTag)->first();
                    if ($gp) $gameCtx = ['points'=>$gp->points,'cumplio'=>$gp->cumplio, 'required'=>$lastGameSeason->points_required];
                    else $gameCtx = ['points'=>0,'cumplio'=>false,'required'=>$lastGameSeason->points_required];
                }
                // tiempo conexión / ingreso / guerra / capital (petición: ignorar donaciones/trofeos)
                // ingreso real: solo si no estaba en snapshot previo (recién llegado), no MIN histórico corto
                $prevSnapId = DB::table('clan_snapshots')->where('id','<',$snapshotId)->orderByDesc('id')->value('id');
                $wasInPrev = $prevSnapId ? DB::table('member_snapshots')->where('clan_snapshot_id',$prevSnapId)->where('player_tag',$pTag)->exists() : false;
                $ingresoAt = !$wasInPrev ? $started->toIso8601String() : DB::table('member_snapshots')->where('player_tag',$pTag)->min('created_at');
                // última guerra con ataques del jugador
                $lastWar = DB::table('war_participations')
                    ->join('wars','wars.id','=','war_participations.war_id')
                    ->where('war_participations.player_tag',$pTag)->where('war_participations.attacks_done','>',0)
                    ->orderByDesc('wars.end_time')->first();
                $lastWarAt = $lastWar->end_time ?? null;
                // última CWL con ataques
                $lastCwl = null;
                if (Schema::hasTable('cwl_participations')) {
                    $lastCwl = DB::table('cwl_participations')
                        ->join('cwl_wars','cwl_wars.id','=','cwl_participations.cwl_war_id')
                        ->where('cwl_participations.player_tag',$pTag)->where('cwl_participations.attacks_done','>',0)
                        ->orderByDesc('cwl_wars.end_time')->first();
                }
                $lastCwlAt = $lastCwl->end_time ?? null;
                // última capital con ataques
                $lastCap = DB::table('capital_participations')
                    ->join('capital_seasons','capital_seasons.id','=','capital_participations.season_id')
                    ->where('capital_participations.player_tag',$pTag)->where('capital_participations.attacks','>',0)
                    ->orderByDesc('capital_seasons.end_time')->first();
                $lastCapAt = $lastCap->end_time ?? null;
                // últimos Juegos del Clan con puntos >0
                $lastGameAt = null; $lastGamePoints = null;
                if (Schema::hasTable('clan_game_participations')) {
                    $lastGame = DB::table('clan_game_participations')
                        ->join('clan_game_seasons','clan_game_seasons.id','=','clan_game_participations.season_id')
                        ->where('clan_game_participations.player_tag',$pTag)->where('clan_game_participations.points','>',0)
                        ->orderByDesc('clan_game_seasons.end_time')->orderByDesc('clan_game_seasons.start_time')->first();
                    $lastGameAt = $lastGame->end_time ?? $lastGame->start_time ?? null;
                    $lastGamePoints = $lastGame->points ?? null;
                }
                // Fallback warStars: detecta actividad guerra/CWL aunque no se capturó inWar (no requiere docker levantado)
                $lastWarStarsAt = null;
                if (Schema::hasColumn('member_snapshots','war_stars')) {
                    try {
                        $historyStars = DB::table('member_snapshots')
                            ->where('player_tag',$pTag)
                            ->orderByDesc('created_at')
                            ->limit(20)
                            ->get(['war_stars','created_at']);
                        for ($i=0; $i < $historyStars->count()-1; $i++) {
                            $curr = (int)($historyStars[$i]->war_stars ?? 0);
                            $prev = (int)($historyStars[$i+1]->war_stars ?? 0);
                            if ($curr > $prev) { $lastWarStarsAt = $historyStars[$i]->created_at; break; }
                        }
                        // si solo hay 1 snapshot y tiene war_stars >0, no podemos saber delta, pero no lo usamos como actividad (evita falsos positivos ingreso)
                    } catch (\Throwable $e) { /* columna aún no migrada en esta transacción */ }
                }
                // historial guerras pasadas: solo guerras terminadas con datos reales
                $warsTotal = DB::table('wars')->where('state','warEnded')->count();
                $warsWithAttack = DB::table('war_participations')->join('wars','wars.id','=','war_participations.war_id')->where('wars.state','warEnded')->where('war_participations.player_tag',$pTag)->where('war_participations.attacks_done','>',0)->count();
                $warsEntered = DB::table('war_participations')->join('wars','wars.id','=','war_participations.war_id')->where('wars.state','warEnded')->where('war_participations.player_tag',$pTag)->count();
                $warsMissedAttack = $warsEntered - $warsWithAttack; // participante pero no atacó
                $warsNotEntered = $warsTotal - $warsEntered;
                $warsParticipationsTotal = DB::table('war_participations')->join('wars','wars.id','=','war_participations.war_id')->where('wars.state','warEnded')->count();
                $lastEnteredAt = DB::table('war_participations')
                    ->join('wars','wars.id','=','war_participations.war_id')
                    ->where('war_participations.player_tag',$pTag)
                    ->orderByDesc('wars.end_time')->value('wars.end_time');
                // attacks en guerra actual
                $attacksDone = 0; $attacksExp = 1;
                if (isset($currentWar['clan']['members'])) {
                    foreach ($currentWar['clan']['members'] as $wm) {
                        if (($wm['tag'] ?? '') === $pTag) { $attacksDone = count($wm['attacks'] ?? []); break; }
                    }
                    $attacksExp = $currentWar['attacksPerMember'] ?? 1;
                }
                $ctx = [
                    'last_activity_at'=>null,
                    'last_war_attack_at'=>$lastWarAt,
                    'last_cwl_attack_at'=>$lastCwlAt,
                    'last_capital_attack_at'=>$lastCapAt,
                    'last_clan_game_at'=>$lastGameAt,
                    'last_clan_game_points'=>$lastGamePoints,
                    'last_war_stars_at'=>$lastWarStarsAt,
                    'ingreso_at'=>$ingresoAt,
                    'is_new'=>!$wasInPrev,
                    'wars_total'=>$warsTotal,
                    'wars_entered'=>$warsEntered,
                    'wars_with_attack'=>$warsWithAttack,
                    'wars_missed_attack'=>$warsMissedAttack,
                    'wars_not_entered'=>$warsNotEntered,
                    'wars_participations_total'=>$warsParticipationsTotal,
                    'last_entered_at'=>$lastEnteredAt,
                    'capital_last_season'=>$capCtx,
                    'clan_game_last_season'=>$gameCtx,
                    'current_war'=>$currentWar,
                    'attacks_done'=>$attacksDone,
                    'attacks_expected'=>$attacksExp,
                    'consecutive'=>0,
                    'has_alta'=>false,
                    'war_preference'=>$pData['warPreference'] ?? 'in',
                ];
                $res = $engine->evaluatePlayer(['name'=>$m['name'],'tag'=>$pTag], $ctx);
                // INGRESO_RECIENTE es alerta separada (no cuenta en límite 1 por jugador)
                $ingresoAlert = null;
                $otherAlerts = [];
                foreach ($res['alerts'] as $al) {
                    if ($al['type']==='INGRESO_RECIENTE') $ingresoAlert = $al;
                    else $otherAlerts[] = $al;
                }
                if ($ingresoAlert) {
                    DB::table('alerts')->insert([
                        'player_tag'=>$pTag,
                        'tipo'=>$ingresoAlert['type'],
                        'severidad'=>$ingresoAlert['severity'],
                        'mensaje'=>$ingresoAlert['msg'],
                        'vista'=>false,
                        'created_at'=>now(),'updated_at'=>now(),
                    ]);
                    $alertsInserted++;
                }
                // solo un mensaje por jugador para el resto: el más grave (CRITICA>ALTA>MEDIA>LEVE)
                $pri = ['CRITICA'=>4,'ALTA'=>3,'MEDIA'=>2,'LEVE'=>1];
                if (!empty($otherAlerts)) {
                    usort($otherAlerts, fn($a,$b)=> ($pri[$b['severity']]??0) <=> ($pri[$a['severity']]??0));
                    $al = $otherAlerts[0];
                    DB::table('alerts')->insert([
                        'player_tag'=>$pTag,
                        'tipo'=>$al['type'],
                        'severidad'=>$al['severity'],
                        'mensaje'=>$al['msg'],
                        'vista'=>false,
                        'created_at'=>now(),'updated_at'=>now(),
                    ]);
                    $alertsInserted++;
                }
                // solo un warning por jugador (el primero)
                if (!empty($res['warnings'])) {
                    $wrn = $res['warnings'][0];
                    $rule = DB::table('rules')->where('key',$wrn['regla'] ?? 'INACTIVITY_9')->first();
                    $sevMap = ['MEDIA'=>'MEDIA','LEVE'=>'LEVE','GRAVE'=>'GRAVE'];
                    $sev = $sevMap[$wrn['severidad']] ?? 'MEDIA';
                    $vencDays = $engine->vencimiento($sev);
                    DB::table('warnings')->insert([
                        'player_tag'=>$pTag,
                        'rule_id'=>$rule->id ?? null,
                        'motivo'=>$wrn['motivo'],
                        'severidad'=>$sev,
                        'origen'=>'AUTO',
                        'estado'=>'ACTIVA',
                        'vence_en'=>now()->addDays($vencDays),
                        'created_at'=>now(),'updated_at'=>now(),
                    ]);
                    $warningsInserted++;
                }
                // player_states upsert básico + war_preference real
                $stateAuto = count($res['alerts']) ? 'EN_RIESGO' : 'ACTIVO';
                if (($res['days_inactive'] ?? 0) >=9) $stateAuto='EXPULSABLE';
                elseif (($res['days_inactive'] ?? 0) >=6) $stateAuto='EN_RIESGO';
                $warPref = strtolower($pData['warPreference'] ?? 'in');
                DB::table('player_states')->updateOrInsert(
                    ['player_tag'=>$pTag],
                    ['estado_auto'=>$stateAuto,'war_preference'=>$warPref,'updated_at'=>now(),'created_at'=>now()]
                );
            }

            $syncLogId = DB::table('sync_logs')->insertGetId([
                'clan_tag'=>$clanTag,
                'status'=>'OK',
                'started_at'=>$started,
                'finished_at'=>now(),
                'payload'=>json_encode(['members'=>count($members),'players'=>count($players),'war_state'=>$currentWar['state'] ?? 'unknown','wars_log'=>count($warLog['items'] ?? []),'wars_inserted'=>$warsInserted,'capital_seasons'=>count($capital['items'] ?? []),'capital_inserted'=>$capitalInserted,'cwl_inserted'=>$cwlInserted,'alerts_inserted'=>$alertsInserted,'warnings_inserted'=>$warningsInserted]),
                'created_at'=>$started,
                'updated_at'=>now(),
            ]);

            DB::commit();
            Cache::put('last_sync_at', now()->toIso8601String(), 600);

            return [
                'status'=>'OK',
                'snapshot_id'=>$snapshotId,
                'sync_log_id'=>$syncLogId,
                'clan'=>$clan,
                'members_count'=>count($members),
                'current_war'=>$currentWar,
                'capital_seasons'=>$capital['items'] ?? $capital,
                'league_group'=>$leagueGroup,
                'wars_inserted'=>$warsInserted,
                'capital_inserted'=>$capitalInserted,
                'cwl_inserted'=>$cwlInserted,
                'alerts_inserted'=>$alertsInserted,
                'warnings_inserted'=>$warningsInserted,
            ];
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Sync failed', ['tag'=>$clanTag,'err'=>$e->getMessage()]);
            DB::table('sync_logs')->insert([
                'clan_tag'=>$clanTag,
                'status'=>'ERROR',
                'started_at'=>$started,
                'finished_at'=>now(),
                'payload'=>json_encode(['error'=>$e->getMessage()]),
                'created_at'=>$started,
                'updated_at'=>now(),
            ]);
            throw $e;
        }
    }
}
