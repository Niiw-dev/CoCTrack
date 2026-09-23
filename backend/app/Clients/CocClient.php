<?php

namespace App\Clients;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CocClient
{
    private string $baseUrl;
    private string $token;
    private int $throttleMs;

    public function __construct()
    {
        $this->baseUrl = config('coc.base_url');
        $this->token = config('coc.token');
        $this->throttleMs = (int) (1000 / max(1, config('coc.throttle_per_second', 9)));
    }

    private function client(): PendingRequest
    {
        return Http::withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
            'Accept' => 'application/json',
        ])->timeout(config('coc.timeout', 8))
          ->retry(config('coc.retry_attempts', 3), 500, function($e, $req){ return $e->getCode() >= 500 || $e->getCode() == 429; }, false);
    }

    private function encodeTag(string $tag): string
    {
        return str_replace('#', '%23', $tag);
    }

    private function throttle(): void
    {
        usleep($this->throttleMs * 1000);
    }

    public function getClan(string $tag): array
    {
        $this->throttle();
        $res = $this->client()->get($this->baseUrl . '/clans/' . $this->encodeTag($tag));
        if ($res->failed()) {
            Log::warning('CoC getClan failed', ['tag' => $tag, 'status' => $res->status(), 'body' => $res->body()]);
            $res->throw();
        }
        return $res->json();
    }

    public function getMembers(string $tag): array
    {
        $this->throttle();
        $res = $this->client()->get($this->baseUrl . '/clans/' . $this->encodeTag($tag) . '/members');
        if ($res->failed()) { $res->throw(); }
        return $res->json()['items'] ?? $res->json();
    }

    public function getPlayer(string $tag): array
    {
        $this->throttle();
        $res = $this->client()->get($this->baseUrl . '/players/' . $this->encodeTag($tag));
        if ($res->failed()) { $res->throw(); }
        return $res->json();
    }

    public function getCurrentWar(string $tag): array
    {
        $this->throttle();
        $res = $this->client()->get($this->baseUrl . '/clans/' . $this->encodeTag($tag) . '/currentwar');
        if ($res->status() === 404 || $res->status() === 403) { return ['state' => 'notInWar', 'reason' => $res->json()]; }
        if ($res->failed()) { $res->throw(); }
        return $res->json();
    }

    public function getWarLog(string $tag, int $limit = 20, ?string $after = null): array
    {
        $this->throttle();
        $query = ['limit' => $limit];
        if ($after) $query['after'] = $after;
        $res = $this->client()->get($this->baseUrl . '/clans/' . $this->encodeTag($tag) . '/warlog', $query);
        if ($res->status() === 403) { return ['items' => [], 'paging' => []]; } // private warlog
        if ($res->failed()) { $res->throw(); }
        return $res->json();
    }

    public function getCapitalSeasons(string $tag, int $limit = 10): array
    {
        $this->throttle();
        $res = $this->client()->get($this->baseUrl . '/clans/' . $this->encodeTag($tag) . '/capitalraidseasons', ['limit' => $limit]);
        if ($res->status() === 404 || $res->status() === 403) return ['items'=>[],'paging'=>[]];
        if ($res->failed()) { Log::warning('CoC getCapitalSeasons failed', ['tag'=>$tag,'status'=>$res->status(),'body'=>$res->body()]); $res->throw(); }
        return $res->json();
    }

    public function getLeagueGroup(string $tag): ?array
    {
        $this->throttle();
        $res = $this->client()->get($this->baseUrl . '/clans/' . $this->encodeTag($tag) . '/currentwar/leaguegroup');
        if ($res->status() === 404 || $res->status() === 403) return null;
        if ($res->failed()) { $res->throw(); }
        return $res->json();
    }

    public function getCwlWar(string $warTag): array
    {
        $this->throttle();
        $res = $this->client()->get($this->baseUrl . '/clanwarleagues/wars/' . $this->encodeTag($warTag));
        if ($res->failed()) { $res->throw(); }
        return $res->json();
    }

    public function getPlayersBulk(array $tags): array
    {
        $out = [];
        foreach ($tags as $tag) {
            try { $out[$tag] = $this->getPlayer($tag); } catch (\Throwable $e) { Log::warning('getPlayer bulk failed', ['tag'=>$tag, 'err'=>$e->getMessage()]); }
        }
        return $out;
    }
}
