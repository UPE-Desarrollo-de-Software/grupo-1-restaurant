import type { Mesa, MesaConCodigo, MesaInput, CuentaMesa, ResumenMesa } from "../types/Mesa";
import { API_BASE_URL } from "../config/env";
import { getToken } from "./auth";
import { mensajeErrorApi } from "./error";

// Un solo lugar de normalización (patrón del proyecto): el backend manda
// ids y montos sueltos; el front trabaja con números.
// `codigo_acceso` jamás se mapea acá: la lista no lo trae y, cuando
// llega (getMesa / ocupar), se devuelve aparte.
function normalizarMesa(m: Record<string, unknown>): Mesa {
    return {
        id: Number(m.id),
        capacidad: Number(m.capacidad),
        estado: String(m.estado),
        usuario_id: m.usuario_id == null ? null : Number(m.usuario_id),
        grupo_codigo: m.grupo_codigo == null ? null : Number(m.grupo_codigo),
        ocupada_desde: m.ocupada_desde == null ? null : String(m.ocupada_desde),
    }
}

const mensajeDe = (data: { message?: string } | null, porDefecto: string): string =>
    typeof data?.message === 'string' ? data.message : porDefecto

// GET /mesas: cualquier empleado autenticado. Se quedan solo los
// campos que usa el front (el modelo también trae codigo_acceso, que
// la lista nunca expone).
export async function getMesas(signal?: AbortSignal): Promise<Mesa[]> {
    const response = await fetch(`${API_BASE_URL}/mesas`, {
        headers: { 'Authorization': `Bearer ${getToken()}` },
        signal,
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, `Error ${response.status} al obtener mesas`))
    }
    // El backend responde 200 con {message} si no hay mesas.
    if (!Array.isArray(data)) return []
    return data.map(m => normalizarMesa(m))
}

// GET /mesas/{id}: además trae el codigo_acceso (se muestra solo en
// EditarMesa). Responde 200 con {message} si la mesa no existe.
export async function getMesa(id: number, signal?: AbortSignal): Promise<MesaConCodigo> {
    const response = await fetch(`${API_BASE_URL}/mesas/${id}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` },
        signal,
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, `Error ${response.status} al obtener la mesa`))
    }
    if (!data || data.id === undefined) {
        throw new Error(mensajeDe(data, 'Mesa no encontrada'))
    }
    return { ...normalizarMesa(data), codigo_acceso: String(data.codigo_acceso) }
}

// POST /mesas: alta con aforo contra PARAMETRO.capacidad_total
// (422 si se supera, mensaje tal cual del backend).
export async function createMesa(mesa: MesaInput): Promise<Mesa> {
    const response = await fetch(`${API_BASE_URL}/mesas`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify(mesa),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, 'Error al crear la mesa'))
    }
    if (!data?.mesa) {
        throw new Error(mensajeDe(data, 'No se pudo crear la mesa'))
    }
    return normalizarMesa(data.mesa)
}

// PUT /mesas/{id}: capacidad y estado son requeridos; el codigo_acceso
// no viaja en el request (queda fuera igualmente).
export async function updateMesa(id: number, mesa: MesaInput): Promise<Mesa> {
    const response = await fetch(`${API_BASE_URL}/mesas/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify(mesa),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, 'Error al actualizar la mesa'))
    }
    if (!data?.mesa) {
        throw new Error(mensajeDe(data, 'Mesa no encontrada'))
    }
    return normalizarMesa(data.mesa)
}

// DELETE /mesas/{id}: borrado lógico. Devuelve cuántas reservas
// pendientes se cancelaron junto con la mesa.
export async function deleteMesa(id: number): Promise<{ message: string; reservas_canceladas: number }> {
    const response = await fetch(`${API_BASE_URL}/mesas/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` },
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, 'Error al eliminar la mesa'))
    }
    if (data?.reservas_canceladas === undefined) {
        // 200 {message} sin detalle = "Mesa no encontrada".
        throw new Error(mensajeDe(data, 'Mesa no encontrada'))
    }
    return {
        message: mensajeDe(data, 'Mesa eliminada exitosamente'),
        reservas_canceladas: Number(data.reservas_canceladas),
    }
}

// POST /mesas/{id}/ocupar: NO regenera el código; devuelve el PIN
// estable de la mesa para pasárselo al cliente.
export async function ocuparMesa(id: number): Promise<{ codigo_acceso: string }> {
    const response = await fetch(`${API_BASE_URL}/mesas/${id}/ocupar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` },
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, 'No se pudo ocupar la mesa'))
    }
    if (!data?.codigo_acceso) {
        throw new Error(mensajeDe(data, 'No se pudo ocupar la mesa'))
    }
    return { codigo_acceso: String(data.codigo_acceso) }
}

// POST /mesas/agrupar: ≥2 mesas, todas ocupadas (422 del backend si
// no). Los códigos de acceso no cambian.
export async function agruparMesas(mesaIds: number[]): Promise<{ grupo_codigo: number }> {
    const response = await fetch(`${API_BASE_URL}/mesas/agrupar`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ mesa_ids: mesaIds }),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, 'No se pudieron agrupar las mesas'))
    }
    if (data?.grupo_codigo === undefined) {
        throw new Error(mensajeDe(data, 'No se pudieron agrupar las mesas'))
    }
    return { grupo_codigo: Number(data.grupo_codigo) }
}

// POST /mesas/desagrupar: saca las mesas indicadas de su grupo.
export async function desagruparMesas(mesaIds: number[]): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/mesas/desagrupar`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ mesa_ids: mesaIds }),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, 'No se pudieron desagrupar las mesas'))
    }
    if (!Array.isArray(data?.mesas)) {
        throw new Error(mensajeDe(data, 'No se pudieron desagrupar las mesas'))
    }
}

// GET /mesas/{id}/cuenta: cuenta dividida en partes por pedido raíz de
// la visita actual (corte por ocupada_desde; funciona con mesa borrada).
export async function getCuentaMesa(id: number, signal?: AbortSignal): Promise<CuentaMesa> {
    const response = await fetch(`${API_BASE_URL}/mesas/${id}/cuenta`, {
        headers: { 'Authorization': `Bearer ${getToken()}` },
        signal,
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, `Error ${response.status} al obtener la cuenta`))
    }
    if (!data || !Array.isArray(data.partes)) {
        throw new Error(mensajeDe(data, 'No se pudo obtener la cuenta de la mesa'))
    }
    return data as CuentaMesa
}

// GET /mesas/{id}/pedidos: comanda de lectura (pedidos no finalizados
// con sus líneas y el estado de confirmación de cada una).
export async function getResumenMesa(id: number, signal?: AbortSignal): Promise<ResumenMesa> {
    const response = await fetch(`${API_BASE_URL}/mesas/${id}/pedidos`, {
        headers: { 'Authorization': `Bearer ${getToken()}` },
        signal,
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, `Error ${response.status} al obtener la comanda`))
    }
    if (!data || !Array.isArray(data.pedidos)) {
        throw new Error(mensajeDe(data, 'No se pudo obtener la comanda de la mesa'))
    }
    return data as ResumenMesa
}
