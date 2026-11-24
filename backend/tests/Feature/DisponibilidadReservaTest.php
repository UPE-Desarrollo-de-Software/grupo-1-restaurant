<?php

use App\Models\ConfigMesa;
use App\Models\Rol;
use App\Models\Usuario;
use Database\Seeders\PermisoSeeder;
use Database\Seeders\RolSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

uses(RefreshDatabase::class);

/*
 * DISPONIBILIDAD HORARIA DE RESERVAS: ventana + intervalo de los turnos,
 * centralizados en DisponibilidadReservaService.
 *
 * La configuración NO vive en la base de datos: se guarda en el archivo
 * de runtime (storage/app/configuracion/...). Acá se apunta a un archivo
 * de test y se borra antes/después de cada caso, así los tests siempre
 * arrancan con los defaults del config y no ensucian el archivo real.
 *
 * OJO: helpers globales ya definidos en otros tests (tokenReserva,
 * conConfig, fijarConfig…) no se redeclaran acá; estos tienen nombres
 * propios y funcionan aunque se corra este archivo solo.
 */

beforeEach(function () {
    $this->seed([PermisoSeeder::class, RolSeeder::class]);

    config(['disponibilidad_reservas.archivo' => storage_path('framework/testing/disponibilidad_reservas.json')]);

    limpiarDisponibilidad();

    fijarSalonDisponibilidad();
});

afterEach(function () {
    limpiarDisponibilidad();
});

/**
 * Token de un empleado del rol indicado.
 */
function tokenDisponibilidad(string $rol): string
{
    $usuario = Usuario::factory()->create([
        'rol_id' => Rol::where('nombre', $rol)->first()->id,
    ]);

    return $usuario->createToken($rol)->plainTextToken;
}

/**
 * Resetea la identidad cacheada del guard y pone el token.
 */
function conDisponibilidad(TestCase $test, string $token): TestCase
{
    app('auth')->forgetGuards();

    return $test->withToken($token);
}

/**
 * Borra el archivo de runtime (config del gerente) para volver a los
 * defaults del config.
 */
function limpiarDisponibilidad(): void
{
    $ruta = (string) config('disponibilidad_reservas.archivo');

    if (File::exists($ruta)) {
        File::delete($ruta);
    }
}

/**
 * Salón mínimo (2 mesas de 4) para que el alta de reservas tenga
 * inventario.
 */
function fijarSalonDisponibilidad(): void
{
    ConfigMesa::query()->delete();
    ConfigMesa::create(['cantidad' => 2, 'capacidad' => 4]);
}

test('la disponibilidad arranca con los valores por defecto del backend', function () {
    conDisponibilidad($this, tokenDisponibilidad('Mozo'))
        ->getJson('/api/configuracion/disponibilidad')
        ->assertOk()
        ->assertJsonPath('hora_inicio', '09:00')
        ->assertJsonPath('hora_fin', '23:00')
        ->assertJsonPath('intervalo_minutos', 30)
        ->assertJsonPath('anticipacion_horas', 2)
        ->assertJsonPath('total_slots', 29)
        ->assertJsonPath('slots.0', '09:00')
        ->assertJsonPath('slots.28', '23:00');

    // Los defaults NO crean archivo: sólo se escribe cuando el gerente
    // guarda un cambio.
    expect(File::exists(config('disponibilidad_reservas.archivo')))->toBeFalse();
});

test('el gerente cambia la ventana y la grilla publica usa la nueva configuracion', function () {
    conDisponibilidad($this, tokenDisponibilidad('Gerente'))
        ->putJson('/api/configuracion/disponibilidad', [
            'hora_inicio' => '10:00',
            'hora_fin' => '14:00',
            'intervalo_minutos' => 60,
        ])
        ->assertOk()
        ->assertJsonPath('disponibilidad.hora_inicio', '10:00')
        ->assertJsonPath('disponibilidad.hora_fin', '14:00')
        ->assertJsonPath('disponibilidad.total_slots', 5)
        ->assertJsonPath('disponibilidad.slots.0', '10:00')
        ->assertJsonPath('disponibilidad.slots.4', '14:00');

    // El cambio quedó en el archivo de runtime, no en la base.
    expect(File::exists(config('disponibilidad_reservas.archivo')))->toBeTrue();

    $fecha = now()->addDays(2)->toDateString();
    $grilla = $this->getJson("/api/cliente/reservas/disponibilidad-dia?fecha={$fecha}")
        ->assertOk()
        ->assertJsonPath('horarios.inicio', '10:00')
        ->assertJsonPath('horarios.fin', '14:00')
        ->assertJsonPath('horarios.intervalo_minutos', 60)
        ->assertJsonPath('horarios.anticipacion_horas', 2);

    expect($grilla->json('slots'))->toHaveCount(5)
        ->and($grilla->json('slots.0.hora'))->toBe('10:00')
        ->and($grilla->json('slots.4.hora'))->toBe('14:00');
});

test('una reserva fuera de la ventana configurada responde 422', function () {
    conDisponibilidad($this, tokenDisponibilidad('Gerente'))
        ->putJson('/api/configuracion/disponibilidad', [
            'hora_inicio' => '10:00',
            'hora_fin' => '14:00',
            'intervalo_minutos' => 30,
        ])
        ->assertOk();

    $datos = [
        'contacto_solicitante' => '1234-5678',
        'fecha' => now()->addDays(2)->toDateString(),
        'cantPersonas' => 2,
    ];

    // 20:00 está dentro de la grilla vieja pero fuera de la nueva.
    $this->postJson('/api/cliente/reservas', $datos + ['hora' => '20:00'])
        ->assertStatus(422)
        ->assertJsonPath('message', 'El horario 20:00 está fuera del horario de reservas configurado (10:00 a 14:00).');

    // Un horario de la ventana sí entra.
    $this->postJson('/api/cliente/reservas', $datos + ['hora' => '11:00'])
        ->assertStatus(201);
});

test('solo el gerente puede cambiar la disponibilidad horaria', function () {
    $this->getJson('/api/configuracion/disponibilidad')->assertUnauthorized();

    $this->putJson('/api/configuracion/disponibilidad', [
        'hora_inicio' => '10:00',
        'hora_fin' => '14:00',
        'intervalo_minutos' => 30,
    ])->assertUnauthorized();

    // Cualquier empleado la lee; sólo gestionar_mesas (Gerente) la edita.
    conDisponibilidad($this, tokenDisponibilidad('Mozo'))
        ->getJson('/api/configuracion/disponibilidad')
        ->assertOk();

    conDisponibilidad($this, tokenDisponibilidad('Mozo'))
        ->putJson('/api/configuracion/disponibilidad', [
            'hora_inicio' => '10:00',
            'hora_fin' => '14:00',
            'intervalo_minutos' => 30,
        ])
        ->assertForbidden();
});
