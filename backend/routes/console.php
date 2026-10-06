<?php

use App\Clients\CocClient;
use App\Exceptions\CocApiAuthException;
use App\Services\SyncService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Auto-sync cada hora mientras haya guerra o semana de CWL activa
Schedule::call(function () {
    $clanTag = config('coc.clan_tag') ?: '#2U992RG2G';
    $syncStarted = false;
    try {
        $coc = app(CocClient::class);
        $active = in_array($coc->getCurrentWar($clanTag)['state'] ?? '', ['preparation', 'inWar'], true);
        if (! $active) {
            // durante la CWL /currentwar responde 404: hay que preguntar por la liga
            // (la respuesta de leaguegroup no trae "tag", el indicador es "rounds")
            $group = $coc->getLeagueGroup($clanTag);
            $active = is_array($group) && ! empty($group['rounds']);
        }
        if ($active) {
            $syncStarted = true;
            app(SyncService::class)->sync($clanTag);
        }
    } catch (CocApiAuthException $e) {
        // SyncService ya registra el error cuando el fallo ocurre dentro del sync;
        // aquí solo cubrimos el chequeo previo, para que el rechazo de token nunca pase inadvertido.
        Log::error('schedule sync: token de la API rechazado', ['err' => $e->getMessage()]);
        if (! $syncStarted) {
            try {
                DB::table('sync_logs')->insert([
                    'clan_tag' => $clanTag,
                    'status' => 'ERROR',
                    'started_at' => now(),
                    'finished_at' => now(),
                    'payload' => json_encode(['error' => $e->getMessage()]),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } catch (Throwable $logError) {
                Log::error('schedule sync: no se pudo registrar el error', ['err' => $logError->getMessage()]);
            }
        }
    } catch (Throwable $e) {
        Log::warning('schedule sync failed', ['err' => $e->getMessage()]);
    }
})->hourly();
