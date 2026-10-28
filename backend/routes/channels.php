<?php

use App\Models\Mesa;
use App\Models\Usuario;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Canales de broadcasting (Reverb)
|--------------------------------------------------------------------------
|
| Dos identidades se suscriben a canales "private":
|
|  - Empleados → POST /api/broadcasting/auth con Bearer token Sanctum;
|    autoriza private-empleado.* según permiso (ROL_PERMISO).
|  - Comensal  → POST /api/cliente/broadcasting/auth con el Bearer
|    codigo_acceso (el middleware 'cliente' resuelve la mesa VIGENTE y
|    la deja en el request); autoriza SOLO private-mesa.{id} propio.
|
| Eventos y payloads: ver app/Events y el contrato para el front en
| ../documentacion/CONTRATO-websockets.md.
*/

// Pedidos en vivo (mozo, cocina y gerente: todos con ver_pedidos).
Broadcast::channel('empleado.pedidos', function (Usuario $user): bool {
    return $user->activo && $user->tienePermiso('ver_pedidos');
});

// Agenda de reservas (mozo y gerente: gestionar_reservas).
Broadcast::channel('empleado.reservas', function (Usuario $user): bool {
    return $user->activo && $user->tienePermiso('gestionar_reservas');
});

// Avisos de "llamar al mozo" (tomar_pedidos: mozo y gerente; la
// cocina no atiende mesas).
Broadcast::channel('empleado.atencion', function (Usuario $user): bool {
    return $user->activo && $user->tienePermiso('tomar_pedidos');
});

// Mesa del comensal: el binding implícito trae la Mesa VIVA (SoftDeletes
// la excluye → no matchea) y acá se compara contra la que resolvió el
// middleware 'cliente' para este Bearer.
// OJO: el primer parámetro NO es un Usuario. PusherBroadcaster exige un
// "usuario" truthy para firmar cualquier canal private-* y el comensal
// no lo es, así que ClienteMiddleware resuelve la MESA como "usuario"
// del request; la identidad real acá sale de cliente_mesa.
Broadcast::channel('mesa.{mesa}', function ($user, Mesa $mesa): bool {
    $clienteMesa = request()->attributes->get('cliente_mesa');

    return $clienteMesa !== null && $clienteMesa->is($mesa);
});
