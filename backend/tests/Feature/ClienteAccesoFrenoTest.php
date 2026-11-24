<?php

use App\Models\Mesa;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/*
 * Frenos del acceso del comensal (sin token):
 *  - POST /api/acceso: 10 fallos por minuto e IP; los aciertos no gastan cupo.
 *  - /api/cliente/*: 10 fallos por minuto e IP con el Bearer.
 *
 * OJO: los helpers globales (mesaVisita, comensal, etc.) viven en
 * ClientePedidoTest — no redeclararlos acá (colisionan en toda la suite).
 */

test('acceso: los aciertos no gastan cupo', function () {
    $mesa = Mesa::factory()->create();

    // Antes el limiter manual contaba los aciertos: a partir del 11
    // respondía 429 aunque el código fuera correcto.
    for ($intento = 0; $intento < 20; $intento++) {
        $this->postJson('/api/acceso', ['codigo' => $mesa->codigo_acceso])
            ->assertOk();
    }
});

test('acceso: 10 fallos por minuto responden 429 con Retry-After', function () {
    for ($intento = 0; $intento < 10; $intento++) {
        $this->postJson('/api/acceso', ['codigo' => '000000'])
            ->assertStatus(401);
    }

    $this->postJson('/api/acceso', ['codigo' => '000000'])
        ->assertStatus(429)
        ->assertHeader('Retry-After')
        ->assertJsonPath('message', 'Demasiados intentos: esperá un momento y volvé a intentar.');
});

test('cliente: 10 fallos por minuto responden 429 y frenan la IP', function () {
    for ($intento = 0; $intento < 10; $intento++) {
        $this->withHeader('Authorization', 'Bearer 000000')
            ->getJson('/api/cliente/pedidos')
            ->assertStatus(401);
    }

    $this->withHeader('Authorization', 'Bearer 0000')
        ->getJson('/api/cliente/pedidos')
        ->assertStatus(429)
        ->assertHeader('Retry-After');

    // El freno corta ANTES de consultar la base (es lo único que
    // impide seguir probando): mientras dura, un código válido desde
    // la misma IP también recibe 429.
    $mesa = Mesa::factory()->create();
    $codigo = $mesa->codigo_acceso;

    $this->withHeader('Authorization', 'Bearer '.$codigo)
        ->getJson('/api/cliente/pedidos')
        ->assertStatus(429);

    // Pasado el minuto, la misma visita vuelve a entrar.
    $this->travel(61)->seconds();

    $this->withHeader('Authorization', 'Bearer '.$codigo)
        ->getJson('/api/cliente/pedidos')
        ->assertOk();
});
