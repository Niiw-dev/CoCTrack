<?php
return [
    'base_url' => env('COC_API_URL', 'https://api.clashofclans.com/v1'),
    'token' => env('COC_API_TOKEN', ''),
    'clan_tag' => env('COC_CLAN_TAG', ''),
    'timeout' => 8,
    'throttle_per_second' => 9,
    'retry_attempts' => 3,
];
