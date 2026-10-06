<?php

namespace Tests\Unit;

use App\Clients\CocClient;
use App\Exceptions\CocApiAuthException;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class CocClientTest extends TestCase
{
    private ?string $tokenFile = null;

    protected function tearDown(): void
    {
        if ($this->tokenFile !== null && is_file($this->tokenFile)) {
            unlink($this->tokenFile);
        }
        $this->tokenFile = null;
        parent::tearDown();
    }

    private function makeClient(string $token = 'token-de-config'): CocClient
    {
        // token_file inexistente => usa el token de config, no el .env real del proyecto
        config(['coc.token' => $token, 'coc.token_file' => '/tmp/coctrack-token-que-no-existe.env']);

        return new CocClient;
    }

    private function writeTokenFile(string $token): string
    {
        $this->tokenFile = tempnam(sys_get_temp_dir(), 'coctrack-env');
        file_put_contents($this->tokenFile, "COC_API_TOKEN={$token}\n");

        return $this->tokenFile;
    }

    public function test_ip_no_permitida_reintenta_y_lanza_excepcion_accionable(): void
    {
        config(['coc.retry_attempts' => 3, 'coc.auth_retry_delay_ms' => 1]);
        Http::fake([
            '*' => Http::response([
                'reason' => 'accessDenied.invalidIp',
                'message' => 'Invalid authorization: API key does not allow access from IP 203.0.113.9',
            ], 403),
        ]);

        $client = $this->makeClient();

        $message = null;
        try {
            $client->getClan('#2U992RG2G');
        } catch (CocApiAuthException $e) {
            $message = $e->getMessage();
        }

        $this->assertNotNull($message, 'El rechazo por IP debe lanzar CocApiAuthException');
        $this->assertStringContainsString('203.0.113.9', $message);
        $this->assertStringContainsString('COC_API_TOKEN', $message);
        Http::assertSentCount(3);
    }

    public function test_warlog_con_403_de_permiso_no_es_error_de_token(): void
    {
        Http::fake([
            '*' => Http::response(['reason' => 'accessDenied.notAllowed', 'message' => 'War log is private'], 403),
        ]);

        $result = $this->makeClient()->getWarLog('#2U992RG2G');

        $this->assertSame([], $result['items']);
        Http::assertSentCount(1);
    }

    public function test_league_group_404_es_fuera_de_cwl_y_no_lanza(): void
    {
        Http::fake(['*' => Http::response(['reason' => 'notFound'], 404)]);

        $this->assertNull($this->makeClient()->getLeagueGroup('#2U992RG2G'));
    }

    public function test_league_group_403_por_ip_lanza_excepcion_en_vez_de_devolver_null(): void
    {
        config(['coc.retry_attempts' => 1]);
        Http::fake([
            '*' => Http::response(['reason' => 'accessDenied.invalidIp', 'message' => 'Invalid authorization'], 403),
        ]);

        $this->expectException(CocApiAuthException::class);
        $this->makeClient()->getLeagueGroup('#2U992RG2G');
    }

    public function test_token_se_relee_del_archivo_env_en_cada_peticion(): void
    {
        Http::fake(['*' => Http::response(['name' => 'Clan'], 200)]);
        $file = $this->writeTokenFile('token-vigente');
        config(['coc.token_file' => $file, 'coc.token' => 'token-viejo-de-entorno']);
        $client = new CocClient;

        $client->getClan('#2U992RG2G');
        Http::assertSent(fn ($request) => $request->hasHeader('Authorization', 'Bearer token-vigente'));

        // cambia el archivo: el mismo cliente debe usar el token nuevo sin reiniciar nada
        file_put_contents($file, "COC_API_TOKEN=token-actualizado\n");
        $client->getClan('#2U992RG2G');
        Http::assertSent(fn ($request) => $request->hasHeader('Authorization', 'Bearer token-actualizado'));
    }

    public function test_falla_transitoria_de_servidor_se_reintenta(): void
    {
        config(['coc.retry_attempts' => 3, 'coc.retry_delay_ms' => 1]);
        Http::fake([
            '*' => Http::sequence()
                ->push('error interno', 500)
                ->push(['name' => 'Clan'], 200),
        ]);

        $result = $this->makeClient()->getClan('#2U992RG2G');

        $this->assertSame('Clan', $result['name']);
        Http::assertSentCount(2);
    }
}
