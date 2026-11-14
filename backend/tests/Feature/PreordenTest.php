<?php

use App\Models\Mesa;
use App\Models\Pedido;
use App\Models\Plato;
use App\Models\Reserva;
use App\Models\Rol;
use App\Models\Usuario;
use App\Services\PreordenService;
use Database\Seeders\PermisoSeeder;
use Database\Seeders\RolSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed([PermisoSeeder::class, RolSeeder::class]);
    preordenAforo();
});

/*
|--------------------------------------------------------------------------
| Helpers propios (prefijo `preorden`, no redeclaran los globales)
|--------------------------------------------------------------------------
*/

// fijarAforo() vive en MesaDinamicaTest; si se corre este archivo solo,
// copiar acá el cuerpo de ese helper.
function preordenAforo(): void
{
    if (function_exists('fijarAforo')) {
        fijarAforo(100);
    }
}

function preordenGerente(): void
{
    app('auth')->forgetGuards();

    Sanctum::actingAs(Usuario::factory()->create([
        'rol_id' => Rol::where('nombre', 'Gerente')->first()->id,
    ]));
}

function preordenPlato(array $attrs = []): Plato
{
    return Plato::factory()->create(array_merge(['disponible' => true], $attrs));
}

/** Una línea por plato, siempre con cantidad 2. */
function preordenLineas(Plato ...$platos): array
{
    return array_map(fn (Plato $p) => ['plato_id' => $p->id, 'cantidad' => 2], $platos);
}

// AJUSTAR los nombres de campos copiando el payload de ReservaTest.
function preordenDatosReserva(array $lineas): array
{
    return [
        'contacto_solicitante' => '1155550000',
        'cantPersonas' => 2,
        'fecha' => now()->addDay()->format('Y-m-d'),
        'hora' => '21:00',
        'preorden' => $lineas,
    ];
}

function preordenReservaWeb(array $lineas): Reserva
{
    $res = test()->postJson('/api/cliente/reservas', preordenDatosReserva($lineas));

    $res->assertCreated();

    return Reserva::latest('id')->firstOrFail();
}

function preordenSetEstado(Reserva $reserva, string $estado): void
{
    Reserva::whereKey($reserva->id)->update(['estado' => $estado]);
}

function preordenCrearMesa(?int $reservaId = null)
{
    return test()->postJson('/api/mesas', array_filter([
        'capacidad' => 4,
        'reserva_id' => $reservaId,
    ], fn ($v) => $v !== null));
}

function preordenFinalizar(Reserva $reserva)
{
    return test()->patchJson("/api/reservas/{$reserva->id}/finalizar");
}

function preordenAssertConvertida(Reserva $reserva, Mesa $mesa, int $lineasEsperadas): void
{
    $pedidos = Pedido::where('mesa_id', $mesa->id)->get();

    expect($pedidos)->toHaveCount(1);
    expect($pedidos->first()->estado)->toBe('enviado');

    $lineas = DB::table('detalle_pedidos')->where('pedido_id', $pedidos->first()->id)->get();

    expect($lineas)->toHaveCount($lineasEsperadas);
    expect($lineas->every(fn ($l) => (bool) $l->confirmado && (int) $l->cantidad === 2))->toBeTrue();

    $preorden = DB::table('detalle_preorden')->where('reserva_id', $reserva->id)->get();

    expect($preorden)->toHaveCount($lineasEsperadas);
    expect($preorden->every(fn ($l) => (int) $l->pedido_id === $pedidos->first()->id))->toBeTrue();
}

function preordenPendientes(Reserva $reserva): int
{
    return DB::table('detalle_preorden')
        ->where('reserva_id', $reserva->id)
        ->whereNull('pedido_id')
        ->count();
}

/*
|--------------------------------------------------------------------------
| Altas
|--------------------------------------------------------------------------
*/

test('el alta web con preorden guarda las lineas y deja mesa_id null', function () {
    $a = preordenPlato();
    $b = preordenPlato();

    $reserva = preordenReservaWeb(preordenLineas($a, $b));

    expect($reserva->mesa_id)->toBeNull();
    $this->assertDatabaseHas('detalle_preorden', ['reserva_id' => $reserva->id, 'plato_id' => $a->id, 'cantidad' => 2]);
    $this->assertDatabaseHas('detalle_preorden', ['reserva_id' => $reserva->id, 'plato_id' => $b->id, 'cantidad' => 2]);
});

test('el alta de empleado con preorden guarda las lineas y deja mesa_id null', function () {
    preordenGerente();
    $plato = preordenPlato();

    $this->postJson('/api/reservas', preordenDatosReserva(preordenLineas($plato)))->assertCreated();

    $reserva = Reserva::latest('id')->firstOrFail();

    expect($reserva->mesa_id)->toBeNull();
    $this->assertDatabaseHas('detalle_preorden', ['reserva_id' => $reserva->id, 'plato_id' => $plato->id, 'cantidad' => 2]);
});

/*
|--------------------------------------------------------------------------
| Edicion por PIN
|--------------------------------------------------------------------------
*/

test('editar la preorden con el PIN correcto devuelve 200 y guarda la linea', function () {
    $reserva = preordenReservaWeb(preordenLineas(preordenPlato()));
    $nuevo = preordenPlato();

    $this->putJson("/api/cliente/reservas/{$reserva->codigo}/preordenes", [
        'preorden' => [['plato_id' => $nuevo->id, 'cantidad' => 3]],
    ])->assertOk();

    $this->assertDatabaseHas('detalle_preorden', ['reserva_id' => $reserva->id, 'plato_id' => $nuevo->id, 'cantidad' => 3]);
});

test('editar la preorden con un PIN inexistente responde igual que /acceso', function () {
    $plato = preordenPlato();

    $esperado = $this->postJson('/api/acceso', ['codigo' => '0000'])->getStatusCode();

    $this->putJson('/api/cliente/reservas/0000/preordenes', [
        'preorden' => preordenLineas($plato),
    ])->assertStatus($esperado);
});

test('editar la preorden con un PIN mal formado devuelve 422', function (string $pin) {
    $plato = preordenPlato();

    $this->putJson("/api/cliente/reservas/{$pin}/preordenes", [
        'preorden' => preordenLineas($plato),
    ])->assertStatus(422);
})->with(['muy corto' => '12', 'letras' => 'abcd', 'muy largo' => '12345']);

test('editar la preorden de una reserva no pendiente devuelve 422', function (string $estado) {
    $reserva = preordenReservaWeb(preordenLineas(preordenPlato()));
    preordenSetEstado($reserva, $estado);

    $this->putJson("/api/cliente/reservas/{$reserva->codigo}/preordenes", [
        'preorden' => preordenLineas(preordenPlato()),
    ])->assertStatus(422);
})->with(['cancelada', 'finalizada']);

/*
|--------------------------------------------------------------------------
| Validacion de lineas
|--------------------------------------------------------------------------
*/

test('una linea invalida en la preorden devuelve 422', function (string $caso) {
    $lineas = match ($caso) {
        'plato inexistente' => [['plato_id' => 999999, 'cantidad' => 1]],
        'plato inactivo' => [['plato_id' => preordenPlato(['disponible' => false])->id, 'cantidad' => 1]],
        'cantidad cero' => [['plato_id' => preordenPlato()->id, 'cantidad' => 0]],
    };

    $this->postJson('/api/cliente/reservas', preordenDatosReserva($lineas))->assertStatus(422);

    expect(Reserva::count())->toBe(0);
})->with(['plato inexistente', 'plato inactivo', 'cantidad cero']);

/*
|--------------------------------------------------------------------------
| Conversion en pedido
|--------------------------------------------------------------------------
*/

test('orden A finalizar y despues crear la mesa convierte la preorden en pedido enviado', function () {
    $reserva = preordenReservaWeb(preordenLineas(preordenPlato(), preordenPlato()));
    preordenGerente();

    preordenFinalizar($reserva)->assertOk();
    preordenCrearMesa($reserva->id)->assertSuccessful();

    preordenAssertConvertida($reserva, Mesa::latest('id')->firstOrFail(), 2);
});

test('orden B crear la mesa y despues finalizar convierte la preorden en pedido enviado', function () {
    $reserva = preordenReservaWeb(preordenLineas(preordenPlato(), preordenPlato()));
    preordenGerente();

    preordenCrearMesa($reserva->id)->assertSuccessful();
    preordenFinalizar($reserva)->assertOk();

    preordenAssertConvertida($reserva, Mesa::latest('id')->firstOrFail(), 2);
});

test('una mesa sin reserva_id deja la preorden pendiente y el respaldo manual la convierte', function () {
    $reserva = preordenReservaWeb(preordenLineas(preordenPlato()));
    preordenGerente();

    preordenCrearMesa()->assertSuccessful();
    preordenFinalizar($reserva)->assertOk();
    $mesa = Mesa::latest('id')->firstOrFail();

    expect(Pedido::where('mesa_id', $mesa->id)->count())->toBe(0);
    expect(preordenPendientes($reserva))->toBe(1);

    $this->postJson("/api/reservas/{$reserva->id}/preordenes/convertir", ['mesa_id' => $mesa->id])
        ->assertSuccessful();

    preordenAssertConvertida($reserva, $mesa, 1);
});

test('la segunda conversion manual devuelve 422 y no duplica el pedido', function () {
    $reserva = preordenReservaWeb(preordenLineas(preordenPlato()));
    preordenGerente();
    preordenFinalizar($reserva)->assertOk();
    preordenCrearMesa($reserva->id)->assertSuccessful();
    $mesa = Mesa::latest('id')->firstOrFail();

    $this->postJson("/api/reservas/{$reserva->id}/preordenes/convertir", ['mesa_id' => $mesa->id])
        ->assertStatus(422);

    expect(Pedido::where('mesa_id', $mesa->id)->count())->toBe(1);
});

test('la llamada automatica repetida no hace nada', function () {
    $reserva = preordenReservaWeb(preordenLineas(preordenPlato()));
    preordenGerente();
    preordenFinalizar($reserva)->assertOk();
    preordenCrearMesa($reserva->id)->assertSuccessful();
    $mesa = Mesa::latest('id')->firstOrFail();

    $resultado = app(PreordenService::class)->convertirPreOrdenEnPedido($reserva->id);

    expect($resultado)->toBeNull();
    expect(Pedido::count())->toBe(1);
    preordenAssertConvertida($reserva, $mesa, 1);
});

test('una reserva cancelada o no_asistio con mesa vinculada no convierte', function (string $estado) {
    $reserva = preordenReservaWeb(preordenLineas(preordenPlato()));
    preordenGerente();
    preordenCrearMesa($reserva->id)->assertSuccessful();
    $mesa = Mesa::latest('id')->firstOrFail();

    preordenSetEstado($reserva, $estado);

    $this->postJson("/api/reservas/{$reserva->id}/preordenes/convertir", ['mesa_id' => $mesa->id])
        ->assertStatus(422);

    expect(Pedido::count())->toBe(0);
    expect(preordenPendientes($reserva))->toBe(1);
})->with(['cancelada', 'no_asistio']);

/*
|--------------------------------------------------------------------------
| Cocina y agenda
|--------------------------------------------------------------------------
*/

test('cocina ve el pedido recien convertido', function () {
    $reserva = preordenReservaWeb(preordenLineas(preordenPlato()));
    preordenGerente();
    preordenFinalizar($reserva)->assertOk();
    preordenCrearMesa($reserva->id)->assertSuccessful();
    $pedido = Pedido::firstOrFail();

    $this->getJson('/api/cocina/pedidos')
        ->assertOk()
        ->assertJsonFragment(['id' => $pedido->id]);
});

test('el resumen marca es_preorden en el pedido convertido y false en uno normal', function () {
    $reserva = preordenReservaWeb(preordenLineas(preordenPlato()));
    preordenGerente();
    preordenFinalizar($reserva)->assertOk();
    preordenCrearMesa($reserva->id)->assertSuccessful();
    $mesa = Mesa::latest('id')->firstOrFail();

    // Un pedido normal en la MISMA mesa (alta de empleado), para
    // contrastar que el flag distingue el origen.
    $this->postJson("/api/mesas/{$mesa->id}/pedidos", [
        'platos' => [['plato_id' => preordenPlato()->id, 'cantidad' => 1]],
    ])->assertCreated();

    $convertidoId = Pedido::min('id');
    $normalId = Pedido::max('id');
    expect($convertidoId)->not->toBe($normalId);

    $porId = collect($this->getJson("/api/mesas/{$mesa->id}/pedidos")
        ->assertOk()
        ->json('pedidos'))->keyBy('id');

    expect($porId[$convertidoId]['es_preorden'])->toBeTrue()
        ->and($porId[$normalId]['es_preorden'])->toBeFalse();

    // La cuenta también marca la parte nacida de la pre-orden (badge
    // "Tu parte" en el front). Se pide con el token del empleado.
    $partes = $this->getJson("/api/mesas/{$mesa->id}/cuenta")->assertOk()->json('partes');

    expect(collect($partes)->firstWhere('pedido_id', $convertidoId)['es_preorden'])->toBeTrue()
        ->and(collect($partes)->firstWhere('pedido_id', $normalId)['es_preorden'])->toBeFalse();

    // El comensal ve lo mismo con su PIN: el pedido de la pre-orden es
    // "suyo" aunque el navegador no tenga sus pedidoIds.
    $cliente = $this->withHeader('Authorization', 'Bearer '.$mesa->codigo_acceso)
        ->getJson('/api/cliente/pedidos')
        ->assertOk()
        ->json('pedidos');

    expect(collect($cliente)->keyBy('id')[$convertidoId]['es_preorden'])->toBeTrue();
});

test('la agenda de reservas incluye la preorden', function () {
    $plato = preordenPlato();
    preordenReservaWeb(preordenLineas($plato));
    preordenGerente();

    $this->getJson('/api/reservas')
        ->assertOk()
        ->assertJsonFragment(['plato_id' => $plato->id, 'cantidad' => 2]);
});

/*
|--------------------------------------------------------------------------
| Empleado (por id) y borrado por PIN
|--------------------------------------------------------------------------
*/

test('el empleado ve y edita la preorden de la reserva por id', function () {
    $plato = preordenPlato();
    $reserva = preordenReservaWeb(preordenLineas($plato));
    $nuevo = preordenPlato();
    preordenGerente();

    $this->getJson("/api/reservas/{$reserva->id}/preordenes")
        ->assertOk()
        ->assertJsonFragment(['plato_id' => $plato->id, 'cantidad' => 2]);

    $this->putJson("/api/reservas/{$reserva->id}/preordenes", [
        'preorden' => [['plato_id' => $nuevo->id, 'cantidad' => 3]],
    ])->assertOk();

    $this->assertDatabaseHas('detalle_preorden', ['reserva_id' => $reserva->id, 'plato_id' => $nuevo->id, 'cantidad' => 3]);
});

test('el cliente vacia su preorden con el PIN', function () {
    $reserva = preordenReservaWeb(preordenLineas(preordenPlato()));

    $this->deleteJson("/api/cliente/reservas/{$reserva->codigo}/preordenes")
        ->assertOk()
        ->assertJsonPath('mensaje', 'Preorden eliminada correctamente');

    expect(DB::table('detalle_preorden')->where('reserva_id', $reserva->id)->count())->toBe(0);
});

test('vaciado de la preorden de una reserva no pendiente devuelve 422', function () {
    $reserva = preordenReservaWeb(preordenLineas(preordenPlato()));
    preordenSetEstado($reserva, 'finalizada');

    $this->deleteJson("/api/cliente/reservas/{$reserva->codigo}/preordenes")->assertStatus(422);

    expect(DB::table('detalle_preorden')->where('reserva_id', $reserva->id)->count())->toBe(1);
});
