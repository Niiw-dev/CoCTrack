<?php

namespace App\Clients;

use App\Exceptions\CocApiAuthException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class CocClient
{
    private string $baseUrl;

    private string $token;

    private int $throttleMs;

    public function __construct()
    {
        $this->baseUrl = config('coc.base_url');
        $this->token = (string) config('coc.token', '');
        $this->throttleMs = (int) (1000 / max(1, config('coc.throttle_per_second', 9)));
    }

    /**
     * El token se relee del archivo .env en cada petición.
     *
     * El contenedor inyecta COC_API_TOKEN con env_file al crearse y esa variable de entorno
     * "gana" sobre el archivo en Laravel: si solo se cambiara .env, el contenedor seguiría
     * usando el token viejo hasta recrearse. Leyendo el archivo, cambiar el token ahí basta.
     */
    private function token(): string
    {
        $file = (string) (config('coc.token_file') ?: base_path('.env'));
        $fromFile = $this->tokenFromFile($file);
        if ($fromFile !== '') {
            $this->token = $fromFile;
        }

        return $this->token;
    }

    private function tokenFromFile(string $file): string
    {
        if (! is_file($file)) {
            return '';
        }
        $contents = @file_get_contents($file);
        if ($contents === false) {
            return '';
        }
        foreach (preg_split('/\r\n|\r|\n/', $contents) as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }
            if (! preg_match('/^COC_API_TOKEN\s*=\s*(.*)$/', $line, $m)) {
                continue;
            }
            $value = trim($m[1], " \t\"'");
            if ($value !== '') {
                return $value;
            }
        }

        return '';
    }

    private function client(): PendingRequest
    {
        $authRetryDelay = max(100, (int) config('coc.auth_retry_delay_ms', 1500));
        $retryDelay = (int) config('coc.retry_delay_ms', 500);

        return Http::withHeaders([
            'Authorization' => 'Bearer '.$this->token(),
            'Accept' => 'application/json',
        ])->timeout(config('coc.timeout', 8))
            ->retry(
                max(1, (int) config('coc.retry_attempts', 3)),
                fn (int $attempt, ?Throwable $e): int => $this->isAuthFailure($e) ? $authRetryDelay : $retryDelay,
                fn (?Throwable $e): bool => $this->shouldRetry($e),
                false
            );
    }

    /**
     * 5xx/429, errores de conexión y rechazos de token se repiten: con CGNAT la IP saliente
     * rota entre intentos, así que un 403 por IP puede resolverse solo en el siguiente intento.
     */
    private function shouldRetry(?Throwable $e): bool
    {
        if ($e instanceof ConnectionException) {
            return true;
        }
        $response = $e instanceof RequestException ? $e->response : null;
        if ($response === null) {
            return false;
        }
        if ($this->isAuthFailureResponse($response)) {
            return true;
        }

        return $response->serverError() || $response->status() === 429;
    }

    private function isAuthFailure(?Throwable $e): bool
    {
        return $e instanceof RequestException
            && $e->response
            && $this->isAuthFailureResponse($e->response);
    }

    /**
     * 401 siempre; 403 solo cuando el cuerpo indica token/IP rechazado. El resto de 403
     * (warlog privado, guerra sin permisos) es respuesta de negocio y se trata aparte.
     */
    private function isAuthFailureResponse(Response $response): bool
    {
        if ($response->status() === 401) {
            return true;
        }
        if ($response->status() !== 403) {
            return false;
        }
        $body = $response->body();

        return str_contains($body, 'accessDenied.invalid')
            || str_contains($body, 'Invalid authorization');
    }

    private function get(string $path, array $query = []): Response
    {
        $this->throttle();
        $response = $this->client()->get($this->baseUrl.$path, $query);

        if ($this->isAuthFailureResponse($response)) {
            throw new CocApiAuthException($this->authFailureMessage($response, $path));
        }

        return $response;
    }

    private function throwIfFailed(Response $response, array $context = []): void
    {
        if (! $response->failed()) {
            return;
        }
        Log::warning('CoC request failed', $context + ['status' => $response->status(), 'body' => $response->body()]);
        $response->throw();
    }

    private function authFailureMessage(Response $response, string $path): string
    {
        $body = $response->body();
        $payload = json_decode($body, true);
        $reason = is_array($payload) ? ($payload['reason'] ?? 'unknown') : 'unknown';
        $ip = preg_match('/IP (?<ip>\d{1,3}(?:\.\d{1,3}){3})/', $body, $m) === 1 ? $m['ip'] : 'desconocida';
        $allowed = $this->tokenAllowedCidrs();

        $message = "CoC API rechazó el token en {$path} ({$response->status()} {$reason}): la IP saliente {$ip} no está permitida";
        if ($allowed !== []) {
            $message .= ' y el token solo permite '.implode(', ', $allowed);
        }
        $message .= '. Edita COC_API_TOKEN en backend/.env con la IP/CIDR nueva (o quita la restricción) en https://developer.clashofclans.com: se recarga solo, sin recrear contenedores.';

        Log::error('CoC API rechazó el token', [
            'path' => $path,
            'status' => $response->status(),
            'reason' => $reason,
            'ip' => $ip,
            'token_allows' => $allowed,
        ]);

        return $message;
    }

    /**
     * @return array<int, string> CIDRs que permite el token actual (claim "limits" del JWT)
     */
    private function tokenAllowedCidrs(): array
    {
        $parts = explode('.', $this->token());
        if (count($parts) < 2) {
            return [];
        }
        $claims = json_decode((string) base64_decode($parts[1]), true);
        if (! is_array($claims)) {
            return [];
        }
        $cidrs = [];
        foreach (($claims['limits'] ?? []) as $limit) {
            if (($limit['type'] ?? '') !== 'client') {
                continue;
            }
            foreach (($limit['cidrs'] ?? []) as $cidr) {
                $cidrs[] = $cidr;
            }
        }

        return $cidrs;
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
        $response = $this->get('/clans/'.$this->encodeTag($tag));
        $this->throwIfFailed($response, ['endpoint' => 'clan', 'tag' => $tag]);

        return $response->json();
    }

    public function getMembers(string $tag): array
    {
        $response = $this->get('/clans/'.$this->encodeTag($tag).'/members');
        $this->throwIfFailed($response, ['endpoint' => 'members', 'tag' => $tag]);

        return $response->json()['items'] ?? $response->json();
    }

    public function getPlayer(string $tag): array
    {
        $response = $this->get('/players/'.$this->encodeTag($tag));
        $this->throwIfFailed($response, ['endpoint' => 'player', 'tag' => $tag]);

        return $response->json();
    }

    public function getCurrentWar(string $tag): array
    {
        $response = $this->get('/clans/'.$this->encodeTag($tag).'/currentwar');
        if (in_array($response->status(), [404, 403], true)) {
            return ['state' => 'notInWar', 'reason' => $response->json()];
        }
        $this->throwIfFailed($response, ['endpoint' => 'currentwar', 'tag' => $tag]);

        return $response->json();
    }

    public function getWarLog(string $tag, int $limit = 20, ?string $after = null): array
    {
        $query = ['limit' => $limit];
        if ($after) {
            $query['after'] = $after;
        }
        $response = $this->get('/clans/'.$this->encodeTag($tag).'/warlog', $query);
        if ($response->status() === 403) {
            return ['items' => [], 'paging' => []]; // warlog privado
        }
        $this->throwIfFailed($response, ['endpoint' => 'warlog', 'tag' => $tag]);

        return $response->json();
    }

    public function getCapitalSeasons(string $tag, int $limit = 10): array
    {
        $response = $this->get('/clans/'.$this->encodeTag($tag).'/capitalraidseasons', ['limit' => $limit]);
        if (in_array($response->status(), [404, 403], true)) {
            return ['items' => [], 'paging' => []];
        }
        $this->throwIfFailed($response, ['endpoint' => 'capital', 'tag' => $tag]);

        return $response->json();
    }

    public function getLeagueGroup(string $tag): ?array
    {
        $response = $this->get('/clans/'.$this->encodeTag($tag).'/currentwar/leaguegroup');
        if ($response->status() === 404) {
            return null; // fuera de la semana de CWL
        }
        if ($response->status() === 403) {
            Log::warning('CoC getLeagueGroup sin permiso', ['tag' => $tag, 'body' => $response->body()]);

            return null;
        }
        $this->throwIfFailed($response, ['endpoint' => 'leaguegroup', 'tag' => $tag]);

        return $response->json();
    }

    public function getCwlWar(string $warTag): array
    {
        $response = $this->get('/clanwarleagues/wars/'.$this->encodeTag($warTag));
        $this->throwIfFailed($response, ['endpoint' => 'cwl-war', 'war' => $warTag]);

        return $response->json();
    }

    public function getPlayersBulk(array $tags): array
    {
        $out = [];
        foreach ($tags as $tag) {
            try {
                $out[$tag] = $this->getPlayer($tag);
            } catch (Throwable $e) {
                if ($e instanceof CocApiAuthException) {
                    throw $e; // un token rechazado no se oculta: corta el sync completo
                }
                Log::warning('getPlayer bulk failed', ['tag' => $tag, 'err' => $e->getMessage()]);
            }
        }

        return $out;
    }
}
