<?php

namespace App\Services;

use Illuminate\Support\Collection;

class RotationService
{
    // Criterio §13: sinJugar DESC, consecutivas ASC, lastWar ASC, incumplimientos ASC, OUT último (deprioriza solo como desempate)
    public function propose(Collection $members, int $teamSize = 15): array
    {
        $sorted = $members->sortBy([
            fn($a,$b) => $b['wars_without_play'] <=> $a['wars_without_play'],
            fn($a,$b) => $a['consecutive'] <=> $b['consecutive'],
            fn($a,$b) => ($a['last_war_at'] ?? '1970') <=> ($b['last_war_at'] ?? '1970'),
            fn($a,$b) => ($a['recent_fails'] ?? 0) <=> ($b['recent_fails'] ?? 0),
            fn($a,$b) => (($a['war_preference'] ?? 'IN') === 'OUT' ? 1 : 0) <=> (($b['war_preference'] ?? 'IN') === 'OUT' ? 1 : 0),
        ])->values();

        $alta = $sorted->filter(fn($m) => ($m['wars_without_play'] ?? 0) >= 3)->values();
        $rotacion = $sorted->filter(fn($m) => ($m['consecutive'] ?? 0) >= 4)->values();
        $media = $sorted->filter(fn($m) => !$alta->contains($m) && !$rotacion->contains($m))->values();

        // Equipo propuesto: top teamSize según criterio §13 (preferencia solo desempate)
        $equipo = $sorted->take($teamSize)->values();
        $banca = $sorted->slice($teamSize)->values();

        return [
            'teamSize' => $teamSize,
            'alta' => $alta,
            'media' => $media,
            'rotacion_obligatoria' => $rotacion,
            'sorted' => $sorted,
            'sorted_prioritized' => $sorted,
            'equipo' => $equipo,
            'banca' => $banca,
            'has_alta' => $alta->isNotEmpty(),
        ];
    }
}
