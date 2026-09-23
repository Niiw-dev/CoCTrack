<?php

namespace Tests\Unit;

use App\Services\RuleEngine;
use Carbon\Carbon;
use PHPUnit\Framework\TestCase;

class RuleEngineTest extends TestCase
{
    private RuleEngine $engine;

    protected function setUp(): void
    {
        parent::setUp();
        $this->engine = new RuleEngine();
    }

    public function test_inactividad_3_6_9_dias(): void
    {
        $now = Carbon::now();
        $player = ['name' => 'Test', 'tag' => '#ABC'];

        $r3 = $this->engine->evaluatePlayer($player, ['last_war_attack_at' => $now->copy()->subDays(3)->toIso8601String(), 'ingreso_at' => $now->copy()->subDays(30)->toIso8601String()]);
        $this->assertCount(1, $r3['alerts']);
        $this->assertEquals('OBSERVACION', $r3['alerts'][0]['type']);

        $r6 = $this->engine->evaluatePlayer($player, ['last_war_attack_at' => $now->copy()->subDays(6)->toIso8601String(), 'ingreso_at' => $now->copy()->subDays(30)->toIso8601String()]);
        $this->assertEquals('EN_RIESGO', $r6['alerts'][0]['type']);

        $r9 = $this->engine->evaluatePlayer($player, ['last_war_attack_at' => $now->copy()->subDays(9)->toIso8601String(), 'ingreso_at' => $now->copy()->subDays(30)->toIso8601String()]);
        $this->assertEquals('INACTIVIDAD_GUERRA_CAPITAL', $r9['alerts'][0]['type']);
        $this->assertEquals('INACTIVITY_9', $r9['warnings'][0]['regla']);
    }

    public function test_capital_menos_de_5(): void
    {
        $player = ['name' => 'Cap', 'tag' => '#1'];
        $r = $this->engine->evaluatePlayer($player, ['capital_last_season' => ['attacks' => 3], 'ingreso_at' => Carbon::now()->toIso8601String(), 'last_war_attack_at' => Carbon::now()->toIso8601String()]);
        $this->assertTrue(collect($r['alerts'])->contains(fn($a) => $a['type'] === 'CAPITAL'));
    }

    public function test_ataque_pendiente_guerra_actual(): void
    {
        $player = ['name' => 'War', 'tag' => '#1'];
        $r = $this->engine->evaluatePlayer($player, ['current_war' => ['state' => 'inWar'], 'attacks_done' => 0, 'attacks_expected' => 2, 'ingreso_at' => Carbon::now()->toIso8601String(), 'last_war_attack_at' => Carbon::now()->toIso8601String()]);
        $this->assertTrue(collect($r['alerts'])->contains(fn($a) => $a['type'] === 'ATAQUE_PENDIENTE'));
    }

    public function test_ingreso_reciente_separado(): void
    {
        $player = ['name' => 'Nuevo', 'tag' => '#1'];
        $r = $this->engine->evaluatePlayer($player, ['ingreso_at' => Carbon::now()->toIso8601String(), 'is_new' => true, 'last_war_attack_at' => Carbon::now()->toIso8601String()]);
        $this->assertTrue(collect($r['alerts'])->contains(fn($a) => $a['type'] === 'INGRESO_RECIENTE'));
        $this->assertEquals('Nuevo es nuevo', $r['alerts'][0]['msg']);
    }

    public function test_nunca_ataco_requiere_participante(): void
    {
        $player = ['name' => 'P', 'tag' => '#1'];
        $r = $this->engine->evaluatePlayer($player, [
            'wars_total' => 3, 'wars_entered' => 1, 'wars_with_attack' => 0, 'wars_missed_attack' => 1, 'wars_not_entered' => 2, 'wars_participations_total' => 1,
            'ingreso_at' => Carbon::now()->subDays(10)->toIso8601String(), 'last_war_attack_at' => Carbon::now()->subDays(10)->toIso8601String()
        ]);
        $this->assertTrue(collect($r['alerts'])->contains(fn($a) => $a['type'] === 'NUNCA_ATACO_GUERRA'));
    }

    public function test_vencimiento(): void
    {
        $this->assertEquals(30, $this->engine->vencimiento('LEVE'));
        $this->assertEquals(60, $this->engine->vencimiento('MEDIA'));
        $this->assertEquals(90, $this->engine->vencimiento('GRAVE'));
    }
}
