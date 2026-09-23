<?php

namespace Tests\Feature;

use App\Services\SyncService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class SyncServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_sync_throttle(): void
    {
        Cache::forget('last_sync_at');
        $svc = app(SyncService::class);
        $this->assertTrue($svc->canSync(10)['allowed']);
        Cache::put('last_sync_at', now()->toIso8601String(), 600);
        $res = $svc->canSync(10);
        $this->assertFalse($res['allowed']);
        $this->assertGreaterThan(0, $res['wait']);
    }

    public function test_sync_throttled_respuesta(): void
    {
        Cache::put('last_sync_at', now()->toIso8601String(), 600);
        $this->postJson('/api/sync', ['clanTag' => '#2U992RG2G'])->assertStatus(429)->assertJson(['status'=>'throttled']);
    }

    public function test_sync_valida_clan_tag(): void
    {
        Cache::forget('last_sync_at');
        $this->postJson('/api/sync', ['clanTag' => 'invalido'])->assertStatus(422);
        $this->postJson('/api/sync', [])->assertStatus(422);
    }
}
