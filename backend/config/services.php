<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // Mercado Pago — Checkout Pro (pago del comensal).
    // Feature flag: sin MP_ACCESS_TOKEN el módulo queda apagado
    // (503 en /cliente/pagos y el botón de pago oculto en el front).
    'mercadopago' => [
        'enabled' => (bool) env('MP_ENABLED', true),
        'access_token' => env('MP_ACCESS_TOKEN'),
        'public_key' => env('MP_PUBLIC_KEY'),
        'webhook_secret' => env('MP_WEBHOOK_SECRET'),
        // Base pública del BACK (notification_url del webhook).
        'app_url' => env('APP_URL'),
        // Base pública del FRONT (back_urls del checkout → /pedido).
        // Vacío = misma base que el back (despliegue mono-dominio).
        'return_url' => env('MP_RETURN_URL'),
    ],

];
