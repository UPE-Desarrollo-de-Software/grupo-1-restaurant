import type { PedidoCocina, LineaCocina, PromocionLinea } from "../types/Mesa";
import { API_BASE_URL } from "../config/env";
import { getToken } from "./auth";
import { mensajeErrorApi } from "./error";

// Capa de cocina (permiso preparar_pedidos): cola de pedidos que están
// en la cocina (enviado + en_preparacion) y avance de SU tramo
// (enviado → en_preparacion → listo). El resto de los estados los
// maneja el mozo desde /pedidos/{id}/estado.
//
// El backend devuelve modelos crudos (Pedido eager-load con `mesa`,
// `detalles.plato`, `detalles.promocion`, `detalles.ingredientes.ingrediente`);
// acá se normaliza UNA sola vez (patrón del proyecto). El `codigo_acceso`
// de la mesa nunca se mapea.

interface LineaJSON {
    id?: number
    cantidad?: number | string
    subtotal?: number | string
    plato?: { nombre?: string } | null
    promocion?: PromocionLinea | null
    ingredientes?: Array<{
        tipo?: string
        ingrediente?: { nombre?: string } | null
    }> | null
}

interface PedidoJSON {
    id?: number
    mesa_id?: number
    estado?: string
    total?: number | string
    fecha?: string
    mesa?: { capacidad?: number | string } | null
    detalles?: LineaJSON[] | null
}

function normalizarLinea(detalle: LineaJSON, indice: number): LineaCocina {
    const personalizaciones = (detalle.ingredientes ?? [])
        .filter(i => i?.ingrediente?.nombre)
        .map(i => ({ tipo: i.tipo, nombre: String(i.ingrediente?.nombre) }))

    return {
        detalle_id: Number(detalle.id ?? indice),
        plato: String(detalle.plato?.nombre ?? 'Plato'),
        promocion: detalle.promocion
            ? {
                id: Number(detalle.promocion.id),
                nombre: String(detalle.promocion.nombre),
                tipo: String(detalle.promocion.tipo),
            }
            : null,
        cantidad: Number(detalle.cantidad ?? 0),
        subtotal: Number(detalle.subtotal ?? 0),
        excluir: personalizaciones.filter(p => p.tipo === 'excluido').map(p => p.nombre),
        agregar: personalizaciones.filter(p => p.tipo === 'agregado').map(p => p.nombre),
    }
}

function normalizarPedido(pedido: PedidoJSON): PedidoCocina {
    const id = Number(pedido.id ?? 0)
    return {
        id,
        mesa_id: Number(pedido.mesa_id ?? 0),
        estado: (pedido.estado ?? 'enviado') as PedidoCocina['estado'],
        total: Number(pedido.total ?? 0),
        fecha: String(pedido.fecha ?? ''),
        mesa_capacidad: Number(pedido.mesa?.capacidad ?? 0),
        lineas: (pedido.detalles ?? []).map((detalle, indice) => normalizarLinea(detalle, indice)),
    }
}

// GET /cocina/pedidos — cola en orden de llegada: { pedidos: [...] }.
export async function getCocinaPedidos(signal?: AbortSignal): Promise<PedidoCocina[]> {
    const response = await fetch(`${API_BASE_URL}/cocina/pedidos`, {
        headers: { 'Authorization': `Bearer ${getToken()}` },
        signal,
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, `Error ${response.status} al obtener la cola de cocina`))
    }
    const pedidos = (data as { pedidos?: PedidoJSON[] } | null)?.pedidos
    if (!Array.isArray(pedidos)) return []
    return pedidos.map(normalizarPedido)
}

// PUT /cocina/pedidos/{id}/estado — sólo en_preparacion | listo
// (422 si la cocina manda otra cosa o el salto no corresponde).
export async function avanzarPedidoCocina(
    pedidoId: number,
    estado: 'en_preparacion' | 'listo',
): Promise<{ mensaje: string }> {
    const response = await fetch(`${API_BASE_URL}/cocina/pedidos/${pedidoId}/estado`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ estado }),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, `Error ${response.status} al actualizar el pedido`))
    }
    return { mensaje: String(data?.mensaje ?? 'Pedido actualizado correctamente.') }
}
