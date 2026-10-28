<?php

use App\Events\AtencionSolicitada;
use App\Events\PedidoCreado;
use App\Events\PedidoEstadoCambiado;
use App\Events\ReservaCancelada;
use App\Events\ReservaCreada;
use App\Models\Mesa;
use App\Models\Plato;
use App\Models\Reserva;
use App\Models\Rol;
use App\Models\Usuario;
use Database\Seeders\PermisoSeeder;
use Database\Seeders\RolSeeder;
use Illuminate\Broadcasting\BroadcastEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed([PermisoSeeder::class, RolSeeder::class]);
});

/*
 * MÓDULO REALTIME (Reverb). Tres bloques:
 *  - emisiones: Queue::fake + BroadcastEvent, verificando evento,
 *    broadcastAs, canales y payload (los eventos van por cola con
 *    afterCommit; QueueFake registra al toque y no ejecuta nada);
 *  - auth de canales: driver 'reverb' REAL (firma HMAC local, sin red).
 *    OJO: los callbacks de routes/channels.php se registran en el BOOT
 *    sobre la conexión por defecto (null en tests), que no valida nada;
 *    usarCanalesReverb() cambia el default a reverb y re-registra los
 *    callbacks sobre esa conexión. El default vuelve a null en cada
 *    test (app nueva), así los jobs broadcast nunca salen a la red.
 *  - llamar al mozo: emisión + rate limit manual por mesa.
 *
 * OJO: helpers globales definidos en otros tests no se redeclaran acá;
 * estos tienen nombres propios y funcionan aunque se corra este solo.
 */

/**
 * Token de un empleado del rol indicado (rol seedeado por el beforeEach).
 */
function tokenBroadcast(string $rol): string
{
    $usuario = Usuario::factory()->create([
        'rol_id' => Rol::where('nombre', $rol)->first()->id,
    ]);

    return $usuario->createToken($rol)->plainTextToken;
}

/**
 * Resetea la identidad cacheada del guard y pone el token.
 */
function empleadoBroadcast(TestCase $test, string $token): TestCase
{
    app('auth')->forgetGuards();

    return $test->withToken($token);
}

/**
 * Mesa + plato + alta de pedido del MOZO (líneas confirmadas).
 * Devuelve [mesa, pedido_id, token].
 *
 * @return array{0: Mesa, 1: int, 2: string}
 */
function mesaConPedidoBroadcast(TestCase $test): array
{
    $mesa = Mesa::factory()->create();
    $plato = Plato::factory()->create();
    $token = tokenBroadcast('Mozo');

    $respuesta = empleadoBroadcast($test, $token)->postJson("/api/mesas/{$mesa->id}/pedidos", [
        'platos' => [['plato_id' => $plato->id, 'cantidad' => 2]],
    ]);
    $respuesta->assertCreated();

    return [$mesa, (int) $respuesta->json('pedido.id'), $token];
}

/**
 * Los BroadcastEvent efectivamente emitidos (push a la cola).
 *
 * @return Collection<int, BroadcastEvent>
 */
function eventosBroadcastPushed(): Collection
{
    return Queue::pushed(BroadcastEvent::class);
}

/**
 * Conecta el driver 'reverb' REAL y (re)registra los callbacks de
 * routes/channels.php sobre esa conexión: en el boot se registraron
 * sobre la conexión por defecto (null), cuyo broadcaster no valida nada.
 * Los auth tests la llaman primero; el resto del archivo queda en null.
 */
function usarCanalesReverb(): void
{
    config(['broadcasting.default' => 'reverb']);

    require base_path('routes/channels.php');
}

/**
 * Firma esperada de un auth de canal privado (Pusher: key:hmac del
 * socket_id y el canal).
 */
function firmaCanalBroadcast(string $canal, string $socketId): string
{
    return config('broadcasting.connections.reverb.key').':'.hash_hmac(
        'sha256',
        "{$socketId}:{$canal}",
        config('broadcasting.connections.reverb.secret')
    );
}

// ==================== EMISIONES ====================

test('crear un pedido emite pedido.creado para los empleados', function () {
    $plato = Plato::factory()->create();
    $mesa = Mesa::factory()->create();
    $token = tokenBroadcast('Mozo');

    Queue::fake();

    $respuesta = empleadoBroadcast($this, $token)->postJson("/api/mesas/{$mesa->id}/pedidos", [
        'platos' => [['plato_id' => $plato->id, 'cantidad' => 2]],
    ]);
    $respuesta->assertCreated();

    $pedidoId = (int) $respuesta->json('pedido.id');

    Queue::assertPushed(BroadcastEvent::class, function ($job) use ($mesa, $pedidoId) {
        $event = $job->event;

        return $event instanceof PedidoCreado
            && $event->broadcastAs() === 'pedido.creado'
            && $event->broadcastOn()[0]->name === 'private-empleado.pedidos'
            && $event->broadcastWith() === [
                'pedido_id' => $pedidoId,
                'mesa_id' => $mesa->id,
                'estado' => 'en_curso',
            ]
            && $job->afterCommit === true;
    });
});

test('confirmar el resumen y enviar emiten pedido.estado con cada estado anterior', function () {
    [$mesa, $pedidoId, $token] = mesaConPedidoBroadcast($this);

    Queue::fake();

    empleadoBroadcast($this, $token)
        ->postJson("/api/pedidos/{$pedidoId}/confirmar")
        ->assertOk();

    empleadoBroadcast($this, $token)
        ->postJson("/api/pedidos/{$pedidoId}/enviar")
        ->assertOk();

    $eventos = eventosBroadcastPushed()
        ->filter(fn ($job) => $job->event instanceof PedidoEstadoCambiado)
        ->map(fn ($job) => $job->event->broadcastWith());

    expect($eventos->all())->toBe([
        [
            'pedido_id' => $pedidoId,
            'mesa_id' => $mesa->id,
            'estado' => 'confirmado',
            'estado_anterior' => 'en_curso',
        ],
        [
            'pedido_id' => $pedidoId,
            'mesa_id' => $mesa->id,
            'estado' => 'enviado',
            'estado_anterior' => 'confirmado',
        ],
    ]);
});

test('avanzar el flujo emite pedido.estado con el estado anterior', function () {
    [$mesa, $pedidoId, $token] = mesaConPedidoBroadcast($this);

    empleadoBroadcast($this, $token)
        ->postJson("/api/pedidos/{$pedidoId}/confirmar")
        ->assertOk();
    empleadoBroadcast($this, $token)
        ->postJson("/api/pedidos/{$pedidoId}/enviar")
        ->assertOk();

    Queue::fake();

    // enviado → en_preparacion es el tramo de la COCINA
    // (permiso preparar_pedidos); el mozo ya no lo puede avanzar.
    empleadoBroadcast($this, tokenBroadcast('Cocina'))
        ->putJson("/api/cocina/pedidos/{$pedidoId}/estado", ['estado' => 'en_preparacion'])
        ->assertOk();

    Queue::assertPushed(BroadcastEvent::class, function ($job) use ($mesa, $pedidoId) {
        $event = $job->event;

        return $event instanceof PedidoEstadoCambiado
            && $event->broadcastAs() === 'pedido.estado'
            && $event->broadcastOn()[0]->name === 'private-empleado.pedidos'
            && $event->broadcastWith() === [
                'pedido_id' => $pedidoId,
                'mesa_id' => $mesa->id,
                'estado' => 'en_preparacion',
                'estado_anterior' => 'enviado',
            ];
    });
});

test('un cambio de estado invalido responde 422 y no emite pedido.estado', function () {
    [, $pedidoId, $token] = mesaConPedidoBroadcast($this);

    Queue::fake();

    // 'entregado' pasa la validación del endpoint (in:…) pero viola la
    // regla de negocio: desde 'en_curso' solo se puede cancelar.
    empleadoBroadcast($this, $token)
        ->putJson("/api/pedidos/{$pedidoId}/estado", ['estado' => 'entregado'])
        ->assertStatus(422)
        ->assertJsonPath('message', "No se puede pasar de 'en_curso' a 'entregado'.");

    expect(
        eventosBroadcastPushed()
            ->filter(fn ($job) => $job->event instanceof PedidoEstadoCambiado)
    )->toHaveCount(0);
});

test('el auto-envio en lote emite un pedido.estado por cada pedido de la mesa', function () {
    // Pedido B: del mozo (líneas ya confirmadas).
    [$mesa, $pedidoB, $token] = mesaConPedidoBroadcast($this);

    $plato = Plato::factory()->create();
    $codigo = $mesa->codigo_acceso;

    Queue::fake();

    // Pedido A: del comensal (líneas sin confirmar → la mesa espera).
    $respuestaA = $this->withToken($codigo)->postJson('/api/cliente/pedidos', [
        'platos' => [['plato_id' => $plato->id, 'cantidad' => 1]],
    ]);
    $respuestaA->assertCreated();
    $pedidoA = (int) $respuestaA->json('pedido.id');

    // Al confirmar A (el último), salen los DOS juntos a cocina (el
    // orden depende de la consulta de activosDeMesa: no se fija acá).
    $this->withToken($codigo)->postJson('/api/cliente/pedidos/confirmar', [
        'pedido_id' => $pedidoA,
    ])->assertOk();

    $eventos = eventosBroadcastPushed()
        ->filter(fn ($job) => $job->event instanceof PedidoEstadoCambiado)
        ->map(fn ($job) => $job->event->broadcastWith())
        ->values();

    expect($eventos)->toHaveCount(2)
        ->and($eventos->pluck('pedido_id')->all())->toEqualCanonicalizing([$pedidoA, $pedidoB]);

    foreach ($eventos as $payload) {
        expect($payload)->toMatchArray([
            'mesa_id' => $mesa->id,
            'estado' => 'enviado',
            'estado_anterior' => 'en_curso',
        ]);
    }
});

test('crear una reserva emite reserva.creada para la agenda', function () {
    $token = tokenBroadcast('Mozo');

    Queue::fake();

    $respuesta = empleadoBroadcast($this, $token)->postJson('/api/reservas', [
        'contacto_solicitante' => '1234567890',
        'fecha' => now()->addDays(2)->toDateString(),
        'hora' => '20:00',
        'cantPersonas' => 4,
    ]);
    $respuesta->assertCreated();

    $reservaId = (int) $respuesta->json('reserva.id');
    $esperado = [
        'reserva_id' => $reservaId,
        'mesa_id' => null,
        'fecha' => now()->addDays(2)->toDateString(),
        'hora' => '20:00:00',
        'cantPersonas' => 4,
        'estado' => 'pendiente',
    ];

    Queue::assertPushed(BroadcastEvent::class, function ($job) use ($esperado) {
        $event = $job->event;

        return $event instanceof ReservaCreada
            && $event->broadcastAs() === 'reserva.creada'
            && $event->broadcastOn()[0]->name === 'private-empleado.reservas'
            && $event->broadcastWith() === $esperado;
    });
});

test('cancelar una reserva emite reserva.cancelada con sus datos', function () {
    $reserva = Reserva::factory()->create();
    $token = tokenBroadcast('Mozo');

    Queue::fake();

    empleadoBroadcast($this, $token)
        ->patchJson("/api/reservas/{$reserva->id}/cancelar")
        ->assertOk();

    Queue::assertPushed(BroadcastEvent::class, function ($job) use ($reserva) {
        $event = $job->event;

        return $event instanceof ReservaCancelada
            && $event->broadcastAs() === 'reserva.cancelada'
            && $event->broadcastOn()[0]->name === 'private-empleado.reservas'
            && $event->broadcastWith() === [
                'reserva_id' => $reserva->id,
                'mesa_id' => null,
                'fecha' => $reserva->fecha,
                'hora' => $reserva->hora,
                'estado' => 'cancelada',
            ];
    });
});

test('destruir una mesa emite reserva.cancelada por cada pendiente legada', function () {
    $mesa = Mesa::factory()->create();
    $pendiente1 = Reserva::factory()->create(['mesa_id' => $mesa->id]);
    $pendiente2 = Reserva::factory()->create(['mesa_id' => $mesa->id]);
    Reserva::factory()->cancelada()->create(['mesa_id' => $mesa->id]);
    $token = tokenBroadcast('Gerente');

    Queue::fake();

    empleadoBroadcast($this, $token)
        ->deleteJson("/api/mesas/{$mesa->id}")
        ->assertOk();

    $eventos = eventosBroadcastPushed()
        ->filter(fn ($job) => $job->event instanceof ReservaCancelada)
        ->map(fn ($job) => $job->event->broadcastWith()['reserva_id']);

    expect($eventos->all())->toEqualCanonicalizing([$pendiente1->id, $pendiente2->id]);
});

// ==================== LLAMAR AL MOZO ====================

test('llamar al mozo emite mesa.atencion a los mozos y a la mesa', function () {
    $this->freezeTime();

    $mesa = Mesa::factory()->create();
    $codigo = $mesa->codigo_acceso;

    Queue::fake();

    $this->withToken($codigo)
        ->postJson('/api/cliente/llamar')
        ->assertOk()
        ->assertJsonPath('mensaje', 'El mozo fue avisado. En un momento se acerca a tu mesa.');

    Queue::assertPushed(BroadcastEvent::class, function ($job) use ($mesa) {
        $event = $job->event;
        $canales = array_map(fn ($canal) => $canal->name, $event->broadcastOn());

        return $event instanceof AtencionSolicitada
            && $event->broadcastAs() === 'mesa.atencion'
            && $canales === ['private-empleado.atencion', 'private-mesa.'.$mesa->id]
            && $event->broadcastWith() === [
                'mesa_id' => $mesa->id,
                'en' => now()->toISOString(),
            ];
    });
});

test('llamar al mozo responde 429 si se repite en el mismo minuto', function () {
    $this->freezeTime();

    $mesa = Mesa::factory()->create();
    $codigo = $mesa->codigo_acceso;

    Queue::fake();

    $this->withToken($codigo)->postJson('/api/cliente/llamar')->assertOk();

    $this->withToken($codigo)
        ->postJson('/api/cliente/llamar')
        ->assertStatus(429)
        ->assertJsonPath('message', 'Ya pediste atención: el mozo ya fue avisado.');

    expect(eventosBroadcastPushed())->toHaveCount(1);
});

// ==================== AUTH DE CANALES ====================

test('el mozo autentica los tres canales de empleados', function () {
    usarCanalesReverb();
    $token = tokenBroadcast('Mozo');

    foreach (['empleado.pedidos', 'empleado.reservas', 'empleado.atencion'] as $canal) {
        $respuesta = empleadoBroadcast($this, $token)->postJson('/api/broadcasting/auth', [
            'channel_name' => "private-{$canal}",
            'socket_id' => '123.456',
        ]);

        $respuesta->assertOk()->assertJsonStructure(['auth']);

        // La firma cubre socket_id + canal: probarla es probar el canal.
        expect($respuesta->json('auth'))
            ->toBe(firmaCanalBroadcast("private-{$canal}", '123.456'));
    }
});

test('la cocina entra al canal de pedidos pero no a reservas ni atencion', function () {
    usarCanalesReverb();
    $token = tokenBroadcast('Cocina');

    $post = fn (string $canal) => empleadoBroadcast($this, $token)->postJson('/api/broadcasting/auth', [
        'channel_name' => "private-{$canal}",
        'socket_id' => '123.456',
    ]);

    $post('empleado.pedidos')->assertOk();
    $post('empleado.reservas')->assertStatus(403);
    $post('empleado.atencion')->assertStatus(403);
});

test('un empleado sin permiso recibe 403 en los canales de empleados', function () {
    usarCanalesReverb();

    $rol = Rol::factory()->create(['nombre' => 'SinPermisosCanal']);
    $usuario = Usuario::factory()->create(['rol_id' => $rol->id]);
    $token = $usuario->createToken('sin-permisos')->plainTextToken;

    foreach (['empleado.pedidos', 'empleado.reservas', 'empleado.atencion'] as $canal) {
        empleadoBroadcast($this, $token)
            ->postJson('/api/broadcasting/auth', [
                'channel_name' => "private-{$canal}",
                'socket_id' => '123.456',
            ])
            ->assertStatus(403);
    }
});

test('un usuario inactivo recibe 403 en el canal de pedidos', function () {
    usarCanalesReverb();

    $usuario = Usuario::factory()->create([
        'rol_id' => Rol::where('nombre', 'Mozo')->first()->id,
        'activo' => false,
    ]);
    $token = $usuario->createToken('inactivo')->plainTextToken;

    empleadoBroadcast($this, $token)
        ->postJson('/api/broadcasting/auth', [
            'channel_name' => 'private-empleado.pedidos',
            'socket_id' => '123.456',
        ])
        ->assertStatus(403);
});

test('el auth de canales de empleados sin token responde 401', function () {
    usarCanalesReverb();

    $this->postJson('/api/broadcasting/auth', [
        'channel_name' => 'private-empleado.pedidos',
        'socket_id' => '123.456',
    ])->assertStatus(401);
});

test('el comensal autentica el canal de su propia mesa', function () {
    usarCanalesReverb();

    $mesa = Mesa::factory()->create();

    $respuesta = $this->withToken($mesa->codigo_acceso)
        ->postJson('/api/cliente/broadcasting/auth', [
            'channel_name' => "private-mesa.{$mesa->id}",
            'socket_id' => '123.456',
        ]);

    $respuesta->assertOk()->assertJsonStructure(['auth']);

    expect($respuesta->json('auth'))
        ->toBe(firmaCanalBroadcast("private-mesa.{$mesa->id}", '123.456'));
});

test('el comensal no puede autenticar otra mesa ni una inexistente', function () {
    usarCanalesReverb();

    $mesa = Mesa::factory()->create();
    $otraMesa = Mesa::factory()->create();

    $conCodigo = fn (string $canal) => $this->withToken($mesa->codigo_acceso)
        ->postJson('/api/cliente/broadcasting/auth', [
            'channel_name' => $canal,
            'socket_id' => '123.456',
        ]);

    $conCodigo("private-mesa.{$otraMesa->id}")->assertStatus(403);
    $conCodigo('private-mesa.999999')->assertStatus(403);
});

test('el auth de canales del comensal exige el codigo de acceso', function () {
    usarCanalesReverb();

    $mesa = Mesa::factory()->create();

    // Sin Authorization.
    $this->postJson('/api/cliente/broadcasting/auth', [
        'channel_name' => "private-mesa.{$mesa->id}",
        'socket_id' => '123.456',
    ])->assertStatus(401);

    // Un token de empleado (Sanctum) no es un codigo de mesa.
    $this->withToken(tokenBroadcast('Mozo'))
        ->postJson('/api/cliente/broadcasting/auth', [
            'channel_name' => "private-mesa.{$mesa->id}",
            'socket_id' => '123.456',
        ])
        ->assertStatus(403);
});
