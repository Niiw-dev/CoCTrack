<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Auto-sync cada hora solo si hay guerra en curso/preparación
Schedule::call(function () {
    $clanTag = config('coc.clan_tag') ?: '#2U992RG2G';
    try {
        $coc = app(\App\Clients\CocClient::class);
        $war = $coc->getCurrentWar($clanTag);
        if (in_array($war['state'] ?? '', ['preparation','inWar'])) {
            app(\App\Services\SyncService::class)->sync($clanTag);
        }
    } catch (\Throwable $e) {
        \Illuminate\Support\Facades\Log::warning('schedule sync failed', ['err'=>$e->getMessage()]);
    }
})->hourly();
