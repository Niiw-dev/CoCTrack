<?php

namespace Tests\Unit;

use App\Services\RotationService;
use Illuminate\Support\Collection;
use PHPUnit\Framework\TestCase;

class RotationServiceTest extends TestCase
{
    public function test_propose_prioriza_sin_jugar_y_consecutivas(): void
    {
        $svc = new RotationService();
        $members = collect([
            ['tag'=>'#1','name'=>'A','wars_without_play'=>5,'consecutive'=>0,'last_war_at'=>'2026-09-18','war_preference'=>'IN','recent_fails'=>0],
            ['tag'=>'#2','name'=>'B','wars_without_play'=>0,'consecutive'=>4,'last_war_at'=>'2026-09-20','war_preference'=>'IN','recent_fails'=>0],
            ['tag'=>'#3','name'=>'C','wars_without_play'=>1,'consecutive'=>1,'last_war_at'=>'2026-09-19','war_preference'=>'IN','recent_fails'=>0],
        ]);
        $res = $svc->propose($members, 15);
        $this->assertCount(1, $res['alta']);
        $this->assertEquals('#1', $res['alta'][0]['tag']);
        $this->assertCount(1, $res['rotacion_obligatoria']);
        $this->assertEquals('#2', $res['rotacion_obligatoria'][0]['tag']);
        $this->assertTrue($res['has_alta']);
    }

    public function test_out_depriorizado(): void
    {
        $svc = new RotationService();
        $members = collect([
            ['tag'=>'#1','name'=>'A','wars_without_play'=>3,'consecutive'=>0,'last_war_at'=>'2026-09-18','war_preference'=>'OUT','recent_fails'=>0],
            ['tag'=>'#2','name'=>'B','wars_without_play'=>3,'consecutive'=>0,'last_war_at'=>'2026-09-18','war_preference'=>'IN','recent_fails'=>0],
        ]);
        $res = $svc->propose($members, 15);
        $this->assertEquals('#2', $res['alta'][0]['tag']);
        $this->assertEquals('#1', $res['alta'][1]['tag']);
    }
}
