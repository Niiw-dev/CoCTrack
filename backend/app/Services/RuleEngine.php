<?php

namespace App\Services;

use Carbon\Carbon;

class RuleEngine
{
    // §19-20: 4d->🟡,6d->🔴,9d->⚫ ; capital 5/5 ; vencimiento 30/60/90
    public function evaluatePlayer(array $player, array $ctx): array
    {
        $alerts = []; $warnings = [];
        $now = Carbon::now();

        // Inactividad unificada: guerra / CWL / capital / juegos / warStars delta — cualquiera resetea contador 4d
        // last_war_stars_at es fallback cuando docker estuvo apagado y no se capturó inWar (delta warStars)
        $candidates = [];
        foreach (['last_war_attack_at','last_cwl_attack_at','last_capital_attack_at','last_clan_game_at','last_war_stars_at','last_activity_at'] as $k) {
            if (!empty($ctx[$k])) {
                try { $candidates[] = Carbon::parse($ctx[$k]); } catch (\Throwable $e) {}
            }
        }
        $lastActivity = !empty($candidates) ? max($candidates) : null; // Carbon comparable via max (latest)
        // ingreso
        $daysSinceIngreso = isset($ctx['ingreso_at']) ? abs($now->diffInDays(Carbon::parse($ctx['ingreso_at']), false)) : 999;
        // si no hay actividad en ningún de los 4, usa ingreso como fallback
        $daysInactive = $lastActivity ? abs($now->diffInDays($lastActivity, false)) : $daysSinceIngreso;
        // cada motivo es independiente (no combinado con ingreso)
        if ($daysInactive >= 9) {
            $alerts[] = ['type'=>'INACTIVIDAD_GENERAL','severity'=>'CRITICA','msg'=>"{$player['name']} 9d sin actividad (guerra/CWL/capital/juegos) — proponer expulsión"];
            $warnings[] = ['severidad'=>'MEDIA','motivo'=>'Inactividad 9d sin actividad en ninguna modalidad','regla'=>'INACTIVITY_9'];
        } elseif ($daysInactive >= 6) {
            $alerts[] = ['type'=>'EN_RIESGO','severity'=>'ALTA','msg'=>"{$player['name']} 6d sin actividad (guerra/CWL/capital/juegos)"];
        } elseif ($daysInactive >= 4) {
            $alerts[] = ['type'=>'OBSERVACION','severity'=>'MEDIA','msg'=>"{$player['name']} 4d sin actividad (guerra/CWL/capital/juegos)"];
        }
        // compatibilidad: mantener tipo antiguo si alguien filtra por él, pero ya no se genera
        // INACTIVIDAD_GUERRA_CAPITAL deprecated -> INACTIVIDAD_GENERAL
        // ingreso reciente solo si realmente es nuevo (no estaba en snapshot previo)
        if (!empty($ctx['is_new']) && $daysSinceIngreso < 3) {
            $alerts[] = ['type'=>'INGRESO_RECIENTE','severity'=>'LEVE','msg'=>"{$player['name']} es nuevo"];
        }

        // Capital participación (<5 ataques) y mejoras (capitalResourcesLooted)
        if (isset($ctx['capital_last_season'])) {
            $c = $ctx['capital_last_season'];
            if (($c['attacks'] ?? 0) < 5) {
                $alerts[] = ['type'=>'CAPITAL','severity'=>'MEDIA','msg'=>"No cumplió capital: {$c['attacks']}/5"];
            }
            if (isset($c['capitalResourcesLooted']) && $c['capitalResourcesLooted'] == 0 && ($c['attacks'] ?? 0) > 0) {
                $alerts[] = ['type'=>'CAPITAL_MEJORA','severity'=>'MEDIA','msg'=>"Atacó capital sin aporte a mejoras"];
            }
        }

        // Juegos del Clan: mínimo puntos requeridos (por defecto 4000)
        if (isset($ctx['clan_game_last_season'])) {
            $g = $ctx['clan_game_last_season'];
            $pts = $g['points'] ?? 0;
            $req = $g['required'] ?? 4000;
            if ($pts < $req) {
                // No bloquea inactividad general, pero genera alerta específica
                $alerts[] = ['type'=>'JUEGOS','severity'=>'MEDIA','msg'=>"No cumplió juegos: {$pts}/{$req} puntos"];
            }
        }

        // Guerra ataques pendientes (actual)
        if (isset($ctx['current_war']) && ($ctx['current_war']['state'] ?? '') === 'inWar') {
            if (($ctx['attacks_done'] ?? 0) < ($ctx['attacks_expected'] ?? 1)) {
                $alerts[] = ['type'=>'ATAQUE_PENDIENTE','severity'=>'ALTA','msg'=>"Ataque pendiente en guerra"];
            }
        }
        // Guerras pasadas: entra y no ataca, o nunca entra
        $warsTotal = $ctx['wars_total'] ?? 0;
        $missed = $ctx['wars_missed_attack'] ?? 0;
        $notEntered = $ctx['wars_not_entered'] ?? 0;
        $withAttack = $ctx['wars_with_attack'] ?? 0;
        // Cada motivo pasado es independiente — solo si fue participante y hay datos reales
        $warsEntered = $ctx['wars_entered'] ?? 0;
        $warsParticipationsTotal = $ctx['wars_participations_total'] ?? 0;
        // sin datos de war_participations (API warLog sin members) no se evalúa pasado
        if ($warsTotal >= 3 && $warsParticipationsTotal > 0) {
            if ($warsEntered > 0 && $withAttack === 0) {
                $alerts[] = ['type'=>'NUNCA_ATACO_GUERRA','severity'=>'ALTA','msg'=>"{$player['name']} 0 ataques en {$warsEntered} guerras donde participó"];
                $warnings[] = ['severidad'=>'MEDIA','motivo'=>"0 ataques en {$warsEntered} guerras participadas",'regla'=>'INACTIVITY_9'];
            }
            if ($warsEntered >= 3 && $missed >= 3) {
                $alerts[] = ['type'=>'INACTIVO_GUERRAS_PASADAS','severity'=>'MEDIA','msg'=>"{$player['name']} no atacó en {$missed}/{$warsEntered} guerras participadas"];
            }
            if ($notEntered === $warsTotal && $warsTotal >= 3) {
                $alerts[] = ['type'=>'NUNCA_ENTRO_GUERRA','severity'=>'MEDIA','msg'=>"{$player['name']} nunca entró a guerra en {$warsTotal} guerras"];
            }
        }
        // Si entró a guerra y no atacó — motivo independiente
        if (!empty($ctx['last_entered_at']) && empty($ctx['last_war_attack_at']) && $warsTotal >= 1) {
            $daysSinceEntered = abs($now->diffInDays(Carbon::parse($ctx['last_entered_at']), false));
            if ($daysSinceEntered >= 3) {
                $alerts[] = ['type'=>'ENTRO_SIN_ATACAR','severity'=>'ALTA','msg'=>"{$player['name']} entró a guerra hace {$daysSinceEntered}d y no atacó"];
            }
        }
        // Ingreso sin guerra como motivo separado
        if ($daysSinceIngreso >= 7 && $withAttack === 0 && $warsTotal >= 3) {
            $alerts[] = ['type'=>'INGRESO_SIN_GUERRA','severity'=>'MEDIA','msg'=>"{$player['name']} lleva {$daysSinceIngreso}d en clan y 0 guerras atacadas"];
        }

        // Rotación 4 consecutivas
        if (($ctx['consecutive'] ?? 0) >= 4 && ($ctx['has_alta'] ?? false)) {
            $alerts[] = ['type'=>'ROTACION_OBLIGATORIA','severity'=>'MEDIA','msg'=>"4 guerras consecutivas — priorizar rotación"];
        }

        return ['alerts'=>$alerts,'warnings'=>$warnings,'days_inactive'=>$daysInactive];
    }

    public function vencimiento(string $severidad): int
    {
        return match($severidad) { 'LEVE'=>30, 'MEDIA'=>60, 'GRAVE'=>90, default=>30 };
    }
}
