<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_ok(): void
    {
        $this->getJson('/api/health')->assertOk()->assertJson(['status'=>'ok']);
    }

    public function test_rotation_requiere_sync(): void
    {
        $this->getJson('/api/rotation?teamSize=15')->assertStatus(404);
    }

    public function test_wars_y_alerts_vacios_inicial(): void
    {
        $this->getJson('/api/wars')->assertOk()->assertJson([]);
        $this->getJson('/api/alerts')->assertOk()->assertJson([]);
    }

    public function test_dashboard_sin_sync(): void
    {
        $res = $this->getJson('/api/dashboard')->assertOk();
        $this->assertNull($res->json('clan_snapshot'));
    }

    public function test_cwl_vacio_inicial(): void
    {
        $this->getJson('/api/cwl/groups')->assertOk()->assertJson([]);
        $this->getJson('/api/cwl/wars')->assertOk()->assertJson([]);
        $this->getJson('/api/capital-seasons')->assertOk()->assertJson([]);
    }

    public function test_members_detail_con_estado_y_historial(): void
    {
        $snapId = \DB::table('clan_snapshots')->insertGetId([
            'clan_tag'=>'#TEST','clan_name'=>'Test','clan_level'=>1,'members_count'=>1,'synced_at'=>now(),'created_at'=>now(),'updated_at'=>now()
        ]);
        \DB::table('member_snapshots')->insert([
            'clan_snapshot_id'=>$snapId,'player_tag'=>'#ABC123','player_name'=>'Tester','role'=>'member','town_hall'=>12,'trophies'=>1000,'donations'=>10,'donations_received'=>5,'war_preference'=>'out','created_at'=>now(),'updated_at'=>now()
        ]);
        \DB::table('player_states')->insert([
            'player_tag'=>'#ABC123','estado_auto'=>'EN_RIESGO','war_preference'=>'out','created_at'=>now(),'updated_at'=>now()
        ]);
        $this->getJson('/api/members')->assertOk()->assertJsonFragment(['player_tag'=>'#ABC123','war_preference'=>'out']);
        $res = $this->getJson('/api/members/'.urlencode('#ABC123'))->assertOk();
        $res->assertJsonPath('tag','#ABC123');
        $this->assertEquals('out', $res->json('state.war_preference'));
        $this->assertCount(1, $res->json('history'));
        $this->assertArrayHasKey('war_history', $res->json());
        $this->assertArrayHasKey('capital_history', $res->json());
        $this->assertArrayHasKey('stats', $res->json());
    }

    public function test_capital_join_nombre(): void
    {
        $seasonId = \DB::table('capital_seasons')->insertGetId([
            'start_time'=>now(),'end_time'=>now()->addDays(1),'state'=>'test','total_attacks'=>5,'raw_json'=>'{}','created_at'=>now(),'updated_at'=>now()
        ]);
        $snapId = \DB::table('clan_snapshots')->insertGetId([
            'clan_tag'=>'#TEST','clan_name'=>'Test','clan_level'=>1,'members_count'=>1,'synced_at'=>now(),'created_at'=>now(),'updated_at'=>now()
        ]);
        \DB::table('member_snapshots')->insert([
            'clan_snapshot_id'=>$snapId,'player_tag'=>'#CAP1','player_name'=>'CapTester','role'=>'member','town_hall'=>10,'trophies'=>500,'donations'=>0,'donations_received'=>0,'war_preference'=>'in','created_at'=>now(),'updated_at'=>now()
        ]);
        \DB::table('capital_participations')->insert([
            'season_id'=>$seasonId,'player_tag'=>'#CAP1','attacks'=>5,'attack_limit'=>5,'capital_resources_looted'=>100,'cumplio'=>true,'created_at'=>now(),'updated_at'=>now()
        ]);
        $res = $this->getJson('/api/capital-seasons/'.$seasonId)->assertOk();
        $this->assertEquals('CapTester', $res->json('participations.0.player_name'));
    }

    public function test_rotation_respeta_war_preference(): void
    {
        $snapId = \DB::table('clan_snapshots')->insertGetId([
            'clan_tag'=>'#TEST','clan_name'=>'Test','clan_level'=>1,'members_count'=>2,'synced_at'=>now(),'created_at'=>now(),'updated_at'=>now()
        ]);
        foreach ([
            ['tag'=>'#OUT5','name'=>'OutAlto','war_preference'=>'out'],
            ['tag'=>'#IN1','name'=>'InBajo','war_preference'=>'in'],
        ] as $m) {
            \DB::table('member_snapshots')->insert([
                'clan_snapshot_id'=>$snapId,'player_tag'=>$m['tag'],'player_name'=>$m['name'],'role'=>'member','town_hall'=>10,'trophies'=>0,'donations'=>0,'donations_received'=>0,'war_preference'=>$m['war_preference'],'created_at'=>now(),'updated_at'=>now()
            ]);
        }
        // crea 5 wars warEnded
        $warIds=[];
        for($i=0;$i<5;$i++){
            $warIds[] = \DB::table('wars')->insertGetId([
                'clan_tag'=>'#TEST','end_time'=>now()->subDays($i),'state'=>'warEnded','team_size'=>15,'attacks_per_member'=>1,'raw_json'=>'{}','created_at'=>now(),'updated_at'=>now()
            ]);
        }
        // IN1 participó en la guerra más reciente (0 sin jugar), OUT5 nunca (5 sin jugar)
        \DB::table('war_participations')->insert([
            'war_id'=>$warIds[0],'player_tag'=>'#IN1','attacks_done'=>2,'attacks_expected'=>2,'stars'=>6,'destruction'=>80,'incumplio'=>false,'created_at'=>now(),'updated_at'=>now()
        ]);
        $res = $this->getJson('/api/rotation?teamSize=5')->assertOk();
        $this->assertEquals('#OUT5', $res->json('equipo.0.tag'));
        $this->assertEquals('OUT', $res->json('equipo.0.war_preference'));
    }
}
