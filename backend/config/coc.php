<?php

return [
    'base_url' => env('COC_API_URL', 'https://api.clashofclans.com/v1'),
    'token' => env('COC_API_TOKEN', ''),
    // Archivo con COC_API_TOKEN. Se relee en cada petición para que cambiar el token
    // en .env no exija recrear contenedores (el env_file del contenedor queda desactualizado).
    'token_file' => env('COC_TOKEN_FILE'),
    'clan_tag' => env('COC_CLAN_TAG', ''),
    'timeout' => 8,
    'throttle_per_second' => 9,
    'retry_attempts' => 3,
    'retry_delay_ms' => 500,
    // Demora extra cuando el 403 es de IP: la IP saliente puede rotar entre intentos.
    'auth_retry_delay_ms' => 1500,
];
