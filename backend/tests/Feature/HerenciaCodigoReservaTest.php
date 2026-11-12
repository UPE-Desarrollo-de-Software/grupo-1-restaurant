<?php

use App\Models\ConfigMesa;
use App\Models\Mesa;
use App\Models\Reserva;
use App\Models\Rol;
use App\Models\Usuario;
use Database\Seeders\PermisoSeeder;
use Database\Seeders\RolSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed([PermisoSeeder::class, RolSeeder::class]);
});

/*
 * Herencia del PIN de la reserva en la mesa principal (POST /mesas
 * {reserva_id}): el cliente usa el MISMO código desde la reserva
 * hasta el último pedido (POST /acceso con reservations.codigo).
 * Cubre: herencia simple (pendiente y finalizada), fallback por
 * colisión (mesa viva y destruida: codigoExiste es withTrashed),
 * solo la primera mesa hereda, flujo comensal, inyección de
 * codigo_acceso, reserva inválida e inmutabilidad del código.
 *
 * OJO: helpers globales ya definidos en otros tests (tokenEmpleado,
 * conEmpleado, fijarAforo, tokenReserva, empleadoReserva, aforoReserva,
 * salonReserva…) no se redeclaran acá; por eso estos tienen nombres
 * propios y funcionan aunque se corra este archivo solo.
 */

/**
 * Token de un empleado del rol indicado.
 */
function tokenHerencia(string $rol): string
{
    $usuario = Usuario::factory()->create([
        'rol_id' => Rol::where('nombre', $rol)->first()->id,
    ]);

    return $usuario->createToken($rol)->plainTextToken;
}

/**
 * Resetea la identidad cacheada del guard y pone el token.
 */
function empleadoHerencia(TestCase $test, string $token): TestCase
{
    app('auth')->forgetGuards();

    return $test->withToken($token);
}

/**
 * Fija el aforo del lugar en la tabla CONFIG_MESA (N mesas de 1
 * cubierto: aforo N y hasta N mesas vivas).
 */
function aforoHerencia(int $capacidad): void
{
    ConfigMesa::query()->delete();
    ConfigMesa::create(['cantidad' => $capacidad, 'capacidad' => 1]);
}

test('la mesa principal de la reserva hereda su PIN', function () {
    aforoHerencia(100);
    $reserva = Reserva::factory()->create(['codigo' => '0421']);
    $mzo = empleadoHerencia($this, tokenHerencia('Mozo'));

    $mesa = $mzo->postJson('/api/mesas', [
        'capacidad' => 4,
        'reserva_id' => $reserva->id,
    ])->assertStatus(201)->json('mesa');

    // El mismo código de la reserva vale como codigo_acceso de la
    // mesa: continuidad desde el alta hasta el último pedido.
    expect($mesa['codigo_acceso'])->toBe('0421')
        ->and(Reserva::findOrFail($reserva->id)->mesa_id)->toBe($mesa['id']);
});

test('una reserva finalizada tambien hereda su PIN', function () {
    aforoHerencia(100);
    $reserva = Reserva::factory()->confirmadaFinalizada()->create(['codigo' => '0777']);
    $mzo = empleadoHerencia($this, tokenHerencia('Mozo'));

    $mesa = $mzo->postJson('/api/mesas', [
        'capacidad' => 2,
        'reserva_id' => $reserva->id,
    ])->assertStatus(201)->json('mesa');

    expect($mesa['codigo_acceso'])->toBe('0777');
});

test('sin reserva_id la mesa genera su propio codigo', function () {
    aforoHerencia(100);
    Reserva::factory()->create(['codigo' => '0421']);
    $mzo = empleadoHerencia($this, tokenHerencia('Mozo'));

    $mesa = $mzo->postJson('/api/mesas', ['capacidad' => 4])
        ->assertStatus(201)
        ->json('mesa');

    // Código generado normal: 4 dígitos y distinto al de la reserva.
    expect($mesa['codigo_acceso'])->toMatch('/^\d{4}$/')
        ->and($mesa['codigo_acceso'])->not->toBe('0421');
});

test('si el PIN ya lo tiene una mesa viva hace fallback', function () {
    aforoHerencia(100);
    $reserva = Reserva::factory()->create(['codigo' => '0421']);
    // Otra mesa (viva) ya usa ese código: el unique no lo permite.
    Mesa::factory()->create(['codigo_acceso' => '0421']);
    $mzo = empleadoHerencia($this, tokenHerencia('Mozo'));

    $mesa = $mzo->postJson('/api/mesas', [
        'capacidad' => 4,
        'reserva_id' => $reserva->id,
    ])->assertStatus(201)->json('mesa');

    // Fallback silencioso: genera otro código de 4 dígitos, no
    // hereda el tomado.
    expect($mesa['codigo_acceso'])->not->toBe('0421')
        ->and($mesa['codigo_acceso'])->toMatch('/^\d{4}$/')
        // La mesa igual queda vinculada como principal de la reserva.
        ->and(Reserva::findOrFail($reserva->id)->mesa_id)->toBe($mesa['id']);
});

test('si el PIN lo tiene una mesa destruida tambien hace fallback', function () {
    aforoHerencia(100);
    $reserva = Reserva::factory()->create(['codigo' => '0421']);
    // Borrado lógico: el código de la mesa destruida no se reusa
    // (codigoExiste es withTrashed).
    Mesa::factory()->create(['codigo_acceso' => '0421'])->delete();
    $mzo = empleadoHerencia($this, tokenHerencia('Mozo'));

    $mesa = $mzo->postJson('/api/mesas', [
        'capacidad' => 4,
        'reserva_id' => $reserva->id,
    ])->assertStatus(201)->json('mesa');

    expect($mesa['codigo_acceso'])->not->toBe('0421')
        ->and($mesa['codigo_acceso'])->toMatch('/^\d{4}$/');
});

test('solo la primera mesa de la reserva hereda el PIN', function () {
    aforoHerencia(100);
    $reserva = Reserva::factory()->create(['codigo' => '0421']);
    $mzo = empleadoHerencia($this, tokenHerencia('Mozo'));

    $primera = $mzo->postJson('/api/mesas', [
        'capacidad' => 4,
        'reserva_id' => $reserva->id,
    ])->assertStatus(201)->json('mesa');

    $segunda = $mzo->postJson('/api/mesas', [
        'capacidad' => 2,
        'reserva_id' => $reserva->id,
    ])->assertStatus(201)->json('mesa');

    // El PIN es único (y /acceso resuelve UNA mesa): solo la
    // principal lo lleva; la segunda genera el suyo.
    expect($primera['codigo_acceso'])->toBe('0421')
        ->and($segunda['codigo_acceso'])->not->toBe('0421')
        ->and($segunda['codigo_acceso'])->toMatch('/^\d{4}$/')
        ->and(Reserva::findOrFail($reserva->id)->mesa_id)->toBe($primera['id']);
});

test('el cliente entra con el PIN de la reserva y usa el Bearer', function () {
    aforoHerencia(100);
    $reserva = Reserva::factory()->create(['codigo' => '0421']);
    $mzo = empleadoHerencia($this, tokenHerencia('Mozo'));

    $mesa = $mzo->postJson('/api/mesas', [
        'capacidad' => 4,
        'reserva_id' => $reserva->id,
    ])->assertStatus(201)->json('mesa');

    // POST /acceso con el PIN de la reserva resuelve SU mesa.
    $this->postJson('/api/acceso', ['codigo' => '0421'])
        ->assertOk()
        ->assertJsonPath('mesa.id', $mesa['id'])
        ->assertJsonPath('mesa.codigo_acceso', '0421');

    // Y ese mismo código sirve de Bearer en las rutas del comensal.
    $this->withHeader('Authorization', 'Bearer 0421')
        ->getJson('/api/cliente/pedidos')
        ->assertOk();
});

test('el codigo_acceso que llega en el request se ignora', function () {
    aforoHerencia(100);
    $mzo = empleadoHerencia($this, tokenHerencia('Mozo'));

    // La credencial no viene del request: la genera el server (igual
    // que en el alta de mesa sin reserva).
    $mesa = $mzo->postJson('/api/mesas', [
        'capacidad' => 4,
        'codigo_acceso' => '9999',
    ])->assertStatus(201)->json('mesa');

    expect($mesa['codigo_acceso'])->not->toBe('9999')
        ->and($mesa['codigo_acceso'])->toMatch('/^\d{4}$/');
});

test('solo reservas pendientes o finalizadas arman mesa', function () {
    aforoHerencia(100);
    $cancelada = Reserva::factory()->cancelada()->create();
    $noAsistio = Reserva::factory()->create(['estado' => 'no_asistio']);
    $mzo = empleadoHerencia($this, tokenHerencia('Mozo'));

    $mzo->postJson('/api/mesas', ['capacidad' => 4, 'reserva_id' => $cancelada->id])
        ->assertStatus(422);

    $mzo->postJson('/api/mesas', ['capacidad' => 4, 'reserva_id' => $noAsistio->id])
        ->assertStatus(422);

    // Reserva inexistente: la validación del controller (exists) → 422.
    $mzo->postJson('/api/mesas', ['capacidad' => 4, 'reserva_id' => 99999])
        ->assertStatus(422);

    expect(Mesa::count())->toBe(0);
});

test('editar la mesa no cambia el codigo heredado', function () {
    aforoHerencia(100);
    $reserva = Reserva::factory()->create(['codigo' => '0421']);
    $mzo = empleadoHerencia($this, tokenHerencia('Mozo'));

    $mesaId = $mzo->postJson('/api/mesas', [
        'capacidad' => 4,
        'reserva_id' => $reserva->id,
    ])->assertStatus(201)->json('mesa.id');

    // codigo_acceso inmutable: queda fuera del update (además lo
    // descarta el service con unset).
    empleadoHerencia($this, tokenHerencia('Gerente'))
        ->putJson("/api/mesas/{$mesaId}", [
            'capacidad' => 4,
            'estado' => 'libre',
            'codigo_acceso' => '9999',
        ])->assertOk();

    expect(Mesa::findOrFail($mesaId)->codigo_acceso)->toBe('0421');
});
