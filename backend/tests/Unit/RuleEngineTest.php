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
        $this->engine = new RuleEngine;
    }

    public function test_inactividad_3_6_9_dias(): void
    {
        $now = Carbon::now();
        $player = ['name' => 'Test', 'tag' => '#ABC'];

        $r3 = $this->engine->evaluatePlayer($player, ['last_war_attack_at' => $now->copy()->subDays(4)->toIso8601String(), 'ingreso_at' => $now->copy()->subDays(30)->toIso8601String()]);
        $this->assertCount(1, $r3['alerts']);
        $this->assertEquals('OBSERVACION', $r3['alerts'][0]['type']);

        $r6 = $this->engine->evaluatePlayer($player, ['last_war_attack_at' => $now->copy()->subDays(6)->toIso8601String(), 'ingreso_at' => $now->copy()->subDays(30)->toIso8601String()]);
        $this->assertEquals('EN_RIESGO', $r6['alerts'][0]['type']);

        $r9 = $this->engine->evaluatePlayer($player, ['last_war_attack_at' => $now->copy()->subDays(9)->toIso8601String(), 'ingreso_at' => $now->copy()->subDays(30)->toIso8601String()]);
        $this->assertEquals('INACTIVIDAD_GENERAL', $r9['alerts'][0]['type']);
        $this->assertEquals('INACTIVITY_9', $r9['warnings'][0]['regla']);
    }

    public function test_capital_menos_de_5(): void
    {
        $player = ['name' => 'Cap', 'tag' => '#1'];
        // Sin actividad en otras modalidades → sí genera alerta CAPITAL
        $r = $this->engine->evaluatePlayer($player, ['capital_last_season' => ['attacks' => 3], 'ingreso_at' => Carbon::now()->toIso8601String()]);
        $this->assertTrue(collect($r['alerts'])->contains(fn ($a) => $a['type'] === 'CAPITAL'));
    }

    public function test_capital_menos_de_5_con_actividad_guerra(): void
    {
        $player = ['name' => 'CapWar', 'tag' => '#2'];
        // Con actividad en guerra → NO genera alerta CAPITAL (actividad en cualquier modalidad cuenta)
        $r = $this->engine->evaluatePlayer($player, ['capital_last_season' => ['attacks' => 3], 'ingreso_at' => Carbon::now()->toIso8601String(), 'last_war_attack_at' => Carbon::now()->toIso8601String()]);
        $this->assertFalse(collect($r['alerts'])->contains(fn ($a) => $a['type'] === 'CAPITAL'));
    }

    public function test_ataque_pendiente_guerra_actual(): void
    {
        $player = ['name' => 'War', 'tag' => '#1'];
        $r = $this->engine->evaluatePlayer($player, ['current_war' => ['state' => 'inWar'], 'attacks_done' => 0, 'attacks_expected' => 2, 'ingreso_at' => Carbon::now()->toIso8601String(), 'last_war_attack_at' => Carbon::now()->toIso8601String()]);
        $this->assertTrue(collect($r['alerts'])->contains(fn ($a) => $a['type'] === 'ATAQUE_PENDIENTE'));
    }

    public function test_ingreso_reciente_separado(): void
    {
        $player = ['name' => 'Nuevo', 'tag' => '#1'];
        $r = $this->engine->evaluatePlayer($player, ['ingreso_at' => Carbon::now()->toIso8601String(), 'is_new' => true, 'last_war_attack_at' => Carbon::now()->toIso8601String()]);
        $this->assertTrue(collect($r['alerts'])->contains(fn ($a) => $a['type'] === 'INGRESO_RECIENTE'));
        $this->assertEquals('Nuevo es nuevo', $r['alerts'][0]['msg']);
    }

    public function test_nunca_ataco_requiere_participante(): void
    {
        $player = ['name' => 'P', 'tag' => '#1'];
        $r = $this->engine->evaluatePlayer($player, [
            'wars_total' => 3, 'wars_entered' => 1, 'wars_with_attack' => 0, 'wars_missed_attack' => 1, 'wars_not_entered' => 2, 'wars_participations_total' => 1,
            'ingreso_at' => Carbon::now()->subDays(10)->toIso8601String(), 'last_war_attack_at' => Carbon::now()->subDays(10)->toIso8601String(),
        ]);
        $this->assertTrue(collect($r['alerts'])->contains(fn ($a) => $a['type'] === 'NUNCA_ATACO_GUERRA'));
    }

    public function test_vencimiento(): void
    {
        $this->assertEquals(30, $this->engine->vencimiento('LEVE'));
        $this->assertEquals(60, $this->engine->vencimiento('MEDIA'));
        $this->assertEquals(90, $this->engine->vencimiento('GRAVE'));
    }

    // Nuevas pruebas: regla CWL estrellas + actividad en cualquier modalidad
    public function test_cwl_estrellas_2_guerras_terminadas_activo(): void
    {
        $player = ['name' => 'CWL', 'tag' => '#CWL'];
        $now = Carbon::now();
        // ≥1 estrella en cada una de las 2 últimas guerras terminadas
        $r = $this->engine->evaluatePlayer($player, [
            'cwl_stars_last2' => [3, 2],
            'ingreso_at' => $now->copy()->subDays(30)->toIso8601String(),
            // sin actividad en otras modalidades
        ]);
        $this->assertTrue($r['is_active']);
        $this->assertCount(0, $r['alerts']);
        $this->assertEquals(0, $r['days_inactive']);
    }

    public function test_cwl_estrellas_con_0_en_una_guerra_no_activo(): void
    {
        $player = ['name' => 'CWL0', 'tag' => '#CWL0'];
        $now = Carbon::now();
        // Tiene estrellas en una pero 0 en la otra → no cumple regla CWL
        $r = $this->engine->evaluatePlayer($player, [
            'cwl_stars_last2' => [3, 0],
            'ingreso_at' => $now->copy()->subDays(30)->toIso8601String(),
            // sin actividad en otras modalidades
        ]);
        $this->assertFalse($r['is_active']);
        // Debería generar alerta de inactividad (9d sin actividad)
        $this->assertTrue(collect($r['alerts'])->contains(fn ($a) => $a['type'] === 'INACTIVIDAD_GENERAL'));
    }

    public function test_cwl_estrellas_vacio_no_bloquea(): void
    {
        $player = ['name' => 'NoCWL', 'tag' => '#NoCWL'];
        $now = Carbon::now();
        // Sin datos CWL (temporada sin guerras terminadas)
        $r = $this->engine->evaluatePlayer($player, [
            'cwl_stars_last2' => [],
            'ingreso_at' => $now->copy()->subDays(30)->toIso8601String(),
        ]);
        $this->assertFalse($r['is_active']);
        // Debería generar alerta de inactividad
        $this->assertTrue(collect($r['alerts'])->contains(fn ($a) => $a['type'] === 'INACTIVIDAD_GENERAL'));
    }

    public function test_actividad_guerra_sin_capital_activo(): void
    {
        $player = ['name' => 'WarOnly', 'tag' => '#War'];
        $now = Carbon::now();
        // Participó en guerra (ayer) pero no en capital
        $r = $this->engine->evaluatePlayer($player, [
            'last_war_attack_at' => $now->copy()->subDay()->toIso8601String(),
            'capital_last_season' => ['attacks' => 0],
            'ingreso_at' => $now->copy()->subDays(30)->toIso8601String(),
        ]);
        $this->assertTrue($r['is_active']);
        // No debe generar alerta de CAPITAL porque tiene actividad en guerra
        $this->assertFalse(collect($r['alerts'])->contains(fn ($a) => $a['type'] === 'CAPITAL'));
    }

    public function test_actividad_capital_sin_guerra_activo(): void
    {
        $player = ['name' => 'CapOnly', 'tag' => '#Cap'];
        $now = Carbon::now();
        // Participó en capital (ayer) pero no en guerra
        $r = $this->engine->evaluatePlayer($player, [
            'last_capital_attack_at' => $now->copy()->subDay()->toIso8601String(),
            'capital_last_season' => ['attacks' => 5],
            'ingreso_at' => $now->copy()->subDays(30)->toIso8601String(),
        ]);
        $this->assertTrue($r['is_active']);
        // Sin alertas de inactividad ni capital (cumplió 5/5)
        $this->assertCount(0, $r['alerts']);
    }

    public function test_actividad_juegos_sin_guerra_activo(): void
    {
        $player = ['name' => 'GamesOnly', 'tag' => '#Games'];
        $now = Carbon::now();
        // Participó en juegos (ayer) pero no en guerra ni capital
        $r = $this->engine->evaluatePlayer($player, [
            'last_clan_game_at' => $now->copy()->subDay()->toIso8601String(),
            'clan_game_last_season' => ['points' => 0, 'required' => 4000],
            'capital_last_season' => ['attacks' => 0],
            'ingreso_at' => $now->copy()->subDays(30)->toIso8601String(),
        ]);
        $this->assertTrue($r['is_active']);
        // No debe generar alertas de JUEGOS ni CAPITAL porque tiene actividad en juegos
        $this->assertFalse(collect($r['alerts'])->contains(fn ($a) => $a['type'] === 'JUEGOS'));
        $this->assertFalse(collect($r['alerts'])->contains(fn ($a) => $a['type'] === 'CAPITAL'));
    }
}
