<?php

use App\Models\Rol;
use App\Models\Usuario;
use Database\Seeders\PermisoSeeder;
use Database\Seeders\RolSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Crea los permisos del DER v2.1 y los asigna a cada rol.
    $this->seed([PermisoSeeder::class, RolSeeder::class]);
});

test('el gerente pasa el middleware de gestionar_usuarios', function () {
    $gerente = Usuario::factory()->create([
        'rol_id' => Rol::where('nombre', 'Gerente')->first()->id,
    ]);

    Sanctum::actingAs($gerente);

    $this->getJson('/api/usuarios')->assertOk();
});

test('el mozo no tiene el permiso gestionar_usuarios', function () {
    $mozo = Usuario::factory()->create([
        'rol_id' => Rol::where('nombre', 'Mozo')->first()->id,
    ]);

    Sanctum::actingAs($mozo);

    $this->getJson('/api/usuarios')->assertForbidden();
});

test('el gerente pasa el middleware de tomar_pedidos', function () {
    $gerente = Usuario::factory()->create([
        'rol_id' => Rol::where('nombre', 'Gerente')->first()->id,
    ]);

    Sanctum::actingAs($gerente);

    // Tiene el permiso, pero no hay mesas: igual llega al controller.
    $this->getJson('/api/mesas/999/pedido-activo')->assertNotFound();
});

test('un usuario desactivado no pasa el middleware de permiso', function () {
    $gerente = Usuario::factory()->create([
        'rol_id' => Rol::where('nombre', 'Gerente')->first()->id,
        'activo' => false,
    ]);

    Sanctum::actingAs($gerente);

    $this->getJson('/api/usuarios')
        ->assertForbidden()
        ->assertJsonPath('message', 'Usuario desactivado. Contacte con el gerente.');
});

test('sin token la ruta protegida responde 401', function () {
    $this->getJson('/api/usuarios')->assertUnauthorized();
});
