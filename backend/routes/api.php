<?php

use App\Services\SyncService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn()=> ['status'=>'ok','time'=>now()]);

Route::post('/sync', function(Request $r, SyncService $svc){
    $r->validate(['clanTag'=>'required|string|regex:/^#[0289CGJLOPQRUVY]+$/i']);
    try {
        $out = $svc->sync($r->clanTag);
        if (($out['status']??'')==='throttled') return response()->json($out, 429);
        return response()->json($out);
    } catch (\Throwable $e){
        return response()->json(['status'=>'ERROR','error'=>$e->getMessage()], 500);
    }
});

Route::get('/clan', function(){
    $snap = DB::table('clan_snapshots')->orderByDesc('synced_at')->first();
    if (!$snap) return response()->json(['message'=>'Sin sincronización aún. Usa POST /api/sync'], 404);
    $members = DB::table('member_snapshots')->where('clan_snapshot_id', $snap->id)->get();
    return response()->json(['clan'=>$snap,'members'=>$members]);
});

Route::get('/members', function(Request $r){
    $snap = DB::table('clan_snapshots')->orderByDesc('synced_at')->first();
    if (!$snap) return response()->json([], 404);
    $q = DB::table('member_snapshots')
        ->leftJoin('player_states','player_states.player_tag','=','member_snapshots.player_tag')
        ->where('clan_snapshot_id', $snap->id)
        ->select('member_snapshots.*','player_states.estado_auto','player_states.estado_manual');
    if ($r->player_tag) $q->where('member_snapshots.player_tag', $r->player_tag);
    return response()->json($q->get());
});

Route::get('/members/{tag}', function(string $tag){
    $tag = str_replace('%23','#',$tag);
    $history = DB::table('member_snapshots')->where('player_tag',$tag)->orderByDesc('created_at')->limit(30)->get();
    $warnings = DB::table('warnings')->where('player_tag',$tag)->orderByDesc('created_at')->get();
    $alerts = DB::table('alerts')->where('player_tag',$tag)->orderByDesc('created_at')->limit(20)->get();
    $state = DB::table('player_states')->where('player_tag',$tag)->first();
    $warHistory = DB::table('war_participations')
        ->join('wars','wars.id','=','war_participations.war_id')
        ->where('war_participations.player_tag',$tag)
        ->orderByDesc('wars.end_time')->limit(20)
        ->select('war_participations.*','wars.end_time','wars.state','wars.result','wars.team_size')
        ->get();
    $capitalHistory = DB::table('capital_participations')
        ->join('capital_seasons','capital_seasons.id','=','capital_participations.season_id')
        ->where('capital_participations.player_tag',$tag)
        ->orderByDesc('capital_seasons.start_time')->limit(10)
        ->select('capital_participations.*','capital_seasons.start_time','capital_seasons.end_time','capital_seasons.state as season_state')
        ->get();
    $stats = [
        'wars_entered'=>$warHistory->count(),
        'wars_with_attack'=>$warHistory->where('attacks_done','>',0)->count(),
        'wars_missed'=> $warHistory->where('attacks_done',0)->count(),
        'stars_total'=> $warHistory->sum('stars'),
        'capital_total'=>$capitalHistory->sum('attacks'),
        'capital_cumplidas'=>$capitalHistory->where('cumplio',true)->count(),
    ];
    return response()->json(['tag'=>$tag,'player_name'=>$history->first()?->player_name,'history'=>$history,'warnings'=>$warnings,'alerts'=>$alerts,'state'=>$state,'war_history'=>$warHistory,'capital_history'=>$capitalHistory,'stats'=>$stats]);
})->where('tag','.*');

Route::get('/dashboard', function(){
    $snap = DB::table('clan_snapshots')->orderByDesc('synced_at')->first();
    $lastSync = DB::table('sync_logs')->orderByDesc('started_at')->first();
    $alerts = DB::table('alerts')->where('vista',false)->orderByDesc('created_at')->limit(5)->get();
    return response()->json(['clan_snapshot'=>$snap,'last_sync'=>$lastSync,'alerts'=>$alerts]);
});

Route::get('/rotation', function(Request $r, \App\Services\RotationService $svc){
    $r->validate(['teamSize'=>'integer|in:5,10,15,20,25,30,50']);
    $teamSize = (int)($r->teamSize ?? 15);
    $snap = DB::table('clan_snapshots')->orderByDesc('synced_at')->first();
    if (!$snap) return response()->json(['error'=>'Sin datos'],404);
    $wars = DB::table('wars')->where('state','warEnded')->orderByDesc('end_time')->limit(10)->get();
    $members = DB::table('member_snapshots')->leftJoin('player_states','player_states.player_tag','=','member_snapshots.player_tag')->where('clan_snapshot_id',$snap->id)->select('member_snapshots.*','player_states.war_preference as ps_war_pref')->get()->map(function($m) use ($wars) {
        $tag = $m->player_tag;
        $parts = DB::table('war_participations')->join('wars','wars.id','=','war_participations.war_id')
            ->where('war_participations.player_tag',$tag)->where('wars.state','warEnded')
            ->orderByDesc('wars.end_time')->get();
        $warsWithoutPlay = 0;
        foreach ($wars as $w) { if ($parts->firstWhere('war_id', $w->id)) break; $warsWithoutPlay++; }
        $consecutive = 0;
        foreach ($wars as $w) { if ($parts->firstWhere('war_id', $w->id)) $consecutive++; else break; }
        $lastWar = $parts->first();
        $lastWarAt = $lastWar ? $lastWar->end_time : null;
        $recentFails = $parts->where('incumplio', true)->count();
        $warPref = $m->war_preference ?? $m->ps_war_pref ?? 'in';
        return [
            'tag'=>$tag,'name'=>$m->player_name,
            'consecutive'=>$consecutive,
            'wars_without_play'=>$warsWithoutPlay,
            'last_war_at'=>$lastWarAt,
            'war_preference'=>strtoupper($warPref),
            'recent_fails'=>$recentFails
        ];
    });
    return response()->json($svc->propose($members, $teamSize));
});

Route::get('/rules', fn()=> DB::table('rules')->get());
Route::get('/sync-logs', fn()=> DB::table('sync_logs')->orderByDesc('started_at')->limit(20)->get());
Route::get('/wars', fn()=> DB::table('wars')->orderByDesc('end_time')->limit(20)->get());
Route::get('/capital-seasons', fn()=> DB::table('capital_seasons')->orderByDesc('start_time')->limit(10)->get());
Route::get('/alerts', fn(Request $r)=> DB::table('alerts')->when($r->tipo, fn($q,$t)=>$q->where('tipo',$t))->orderByDesc('created_at')->limit($r->limit ?? 100)->get());
Route::get('/warnings', fn(Request $r)=> DB::table('warnings')->when($r->player_tag, fn($q,$t)=>$q->where('player_tag',$t))->orderByDesc('created_at')->limit($r->limit ?? 100)->get());
Route::get('/wars/{id}', function(int $id){
    $war = DB::table('wars')->find($id);
    if (!$war) return response()->json(['error'=>'No encontrado'],404);
    $parts = DB::table('war_participations')
        ->leftJoin('member_snapshots','member_snapshots.player_tag','=','war_participations.player_tag')
        ->where('war_participations.war_id',$id)
        ->select('war_participations.*','member_snapshots.player_name')
        ->distinct()->get()->unique('player_tag')->values();
    $parts = $parts->map(fn($p)=> (array)$p + ['player_name'=>$p->player_name ?? $p->player_tag]);
    return response()->json(['war'=>$war,'participations'=>$parts]);
});
Route::get('/capital-seasons/{id}', function(int $id){
    $s = DB::table('capital_seasons')->find($id);
    if (!$s) return response()->json(['error'=>'No encontrado'],404);
    $parts = DB::table('capital_participations')
        ->leftJoin('member_snapshots','member_snapshots.player_tag','=','capital_participations.player_tag')
        ->where('capital_participations.season_id',$id)
        ->select('capital_participations.*','member_snapshots.player_name')
        ->distinct()->get()->unique('player_tag')->values()
        ->map(fn($p)=> (array)$p + ['player_name'=>$p->player_name ?? $p->player_tag]);
    return response()->json(['season'=>$s,'participations'=>$parts]);
});

// CWL
Route::get('/cwl/groups', fn()=> DB::table('cwl_groups')->orderByDesc('created_at')->get());
Route::get('/cwl/wars', fn()=> DB::table('cwl_wars')->orderByDesc('end_time')->limit(30)->get());
Route::get('/cwl/wars/{warTag}', function(string $warTag){
    $warTag = str_replace('%23','#',$warTag);
    $w = DB::table('cwl_wars')->where('war_tag',$warTag)->first();
    if (!$w) return response()->json(['error'=>'No encontrado'],404);
    return response()->json($w);
})->where('warTag','.*');
Route::get('/cwl/groups/{id}', function(int $id){
    $g = DB::table('cwl_groups')->find($id);
    if (!$g) return response()->json(['error'=>'No encontrado'],404);
    $wars = DB::table('cwl_wars')->where('cwl_group_id',$id)->orderByDesc('end_time')->get();
    // parse rounds from raw_json for convenience
    $raw = json_decode($g->raw_json ?? '{}', true);
    return response()->json(['group'=>$g,'wars'=>$wars,'raw'=>$raw]);
});
