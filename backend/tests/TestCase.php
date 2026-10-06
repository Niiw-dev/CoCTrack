<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Red de seguridad: las pruebas jamás deben tocar una base real.
     *
     * El contenedor inyecta DB_* con env_file y Laravel lee $_SERVER antes que $_ENV/putenv,
     * así que aunque phpunit.xml declare DB_CONNECTION=sqlite (incluso con force="true")
     * la aplicación seguía usando la base de producción y RefreshDatabase la borraba.
     * Se fija la conexión de pruebas en las tres vías que lee Laravel y se comprueba
     * antes de arrancar que la aplicación no va a conectarse a otra cosa.
     */
    protected function setUp(): void
    {
        $this->forceTestingDatabaseEnv();

        parent::setUp();

        if (config('database.default') !== 'sqlite') {
            $this->fail(sprintf(
                'Las pruebas deben correr sobre sqlite y la conexión activa es "%s": se aborta para no tocar una base real.',
                config('database.default')
            ));
        }
    }

    private function forceTestingDatabaseEnv(): void
    {
        $settings = [
            'APP_ENV' => 'testing',
            'DB_CONNECTION' => 'sqlite',
            'DB_DATABASE' => ':memory:',
            'DB_URL' => '',
            'CACHE_STORE' => 'array',
            'SESSION_DRIVER' => 'array',
            'QUEUE_CONNECTION' => 'sync',
            'MAIL_MAILER' => 'array',
        ];

        foreach ($settings as $name => $value) {
            $_SERVER[$name] = $value;
            $_ENV[$name] = $value;
            putenv("{$name}={$value}");
        }
    }
}
