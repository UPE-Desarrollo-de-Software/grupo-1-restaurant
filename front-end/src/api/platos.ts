import type { PlatoListar, PlatoObtener, PlatoInput, PlatoResponse, IngredientePlato, Promocion } from "../types/Menu"
import { API_BASE_URL } from "../config/env"
import { getToken } from "./auth"
import { mensajeErrorApi } from "./error"
import { getCategorias } from "./categorias"
import { getPromociones } from "./promociones"

// El backend manda decimal sin $cast (llega string) y boolean sin $cast (llega 1/0):
// la conversión ocurre UNA sola vez acá, en la capa de API.
type PromocionJSON = Omit<Promocion, 'valor'> & {
    valor: string | number | null
}

type PlatoListarJSON = Omit<PlatoListar, 'precio' | 'disponible' | 'promocion'> & {
    precio: string | number     // tolera string del GET y number del POST
    disponible: number | boolean
    promocion: PromocionJSON | null
}

type IngredientePlatoJSON = Omit<IngredientePlato, 'precioAdicional' | 'pivot'> & {
    precioAdicional: string | number
    pivot?: { opcional?: number | boolean; por_defecto?: number | boolean }
}

type PlatoObtenerJSON = Omit<PlatoObtener, 'precio' | 'disponible' | 'ingredientes' | 'promocion'> & {
    precio: string | number
    disponible: number | boolean
    // Presente en GET /platos/{id}; las respuestas de POST/PUT solo traen promocion_id.
    promocion?: PromocionJSON | null
    ingredientes?: IngredientePlatoJSON[]
}

type PlatoConIngredientesJSON = PlatoObtenerJSON & { ingredientes: PlatoObtenerJSON['ingredientes'] }

function normalizarPromocion(promocion: PromocionJSON): Promocion {
    return {
        ...promocion,
        valor: promocion.valor === null ? null : Number(promocion.valor),
    }
}

function normalizarPlatoObtener(plato: PlatoConIngredientesJSON): PlatoObtener {
    return {
        ...plato,
        precio: Number(plato.precio),
        disponible: Boolean(plato.disponible),
        promocion: plato.promocion ? normalizarPromocion(plato.promocion) : null,
        ingredientes: (plato.ingredientes ?? []).map(ing => ({
            id: ing.id,
            nombre: ing.nombre,
            precioAdicional: Number(ing.precioAdicional),
            pivot: {
                opcional: Boolean(ing.pivot?.opcional),
                por_defecto: Boolean(ing.pivot?.por_defecto),
            },
        })),
    }
}

export async function getPlatos(signal?: AbortSignal): Promise<PlatoListar[]>{
    const response = await fetch(`${API_BASE_URL}/platos`,
        {signal}
    )

    if(!response.ok){
        throw new Error(`Error ${response.status} al obtener el menú`)
    }

    const data = await response.json()
    if(!Array.isArray(data)) return []
    return (data as PlatoListarJSON[]).map(p => ({
        ...p,
        precio: Number(p.precio),
        disponible: Boolean(p.disponible),
        promocion: p.promocion ? normalizarPromocion(p.promocion) : null,
    }))

}

// Listado COMPLETO (activos e inactivos) para el panel del gerente.
// GET /platos/todos (auth + permiso gestionar_platos) responde con
// Plato::all(): no trae `categoria_nombre` ni la promo cargada, así que
// se enriquecen acá (categorías y promociones) para que la tarjeta del
// panel muestre lo mismo que la carta pública.
export async function getPlatosTodos(signal?: AbortSignal): Promise<PlatoListar[]> {
    const response = await fetch(`${API_BASE_URL}/platos/todos`, {
        signal,
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
        },
    })

    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, `Error ${response.status} al obtener los platos`))
    }
    // El backend responde 200 con {message} si no hay platos.
    if (!Array.isArray(data)) return []

    const [categorias, promociones] = await Promise.allSettled([
        getCategorias(signal),
        getPromociones(signal),
    ])
    const nombres = new Map<number, string>(
        (categorias.status === 'fulfilled' ? categorias.value : [])
            .map(c => [c.id, c.nombre])
    )
    const ofertas = new Map<number, Promocion>(
        (promociones.status === 'fulfilled' ? promociones.value : [])
            .map(p => [p.id, p])
    )

    return (data as PlatoListarJSON[]).map(p => ({
        ...p,
        categoria_nombre: nombres.get(p.categoria_id) ?? 'Sin categoría',
        promocion: p.promocion
            ? normalizarPromocion(p.promocion)
            : (p.promocion_id != null ? ofertas.get(p.promocion_id) ?? null : null),
        precio: Number(p.precio),
        disponible: Boolean(p.disponible),
    }))
}

export async function getPlato(id: number, signal?: AbortSignal): Promise<PlatoObtener> {
    const response = await fetch(`${API_BASE_URL}/platos/${id}`, { signal })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(data?.message ?? `Error ${response.status} al obtener el plato`)
    }
    // El backend responde 200 con {message} si el plato no existe (no es 404).
    if (!data || typeof data !== 'object' || !('id' in data)) {
        throw new Error(data?.message ?? 'No se encontró el plato')
    }
    return normalizarPlatoObtener(data as PlatoConIngredientesJSON)
}

export async function updatePlato(id: number, plato: PlatoInput): Promise<PlatoResponse> {
    const response = await fetch(`${API_BASE_URL}/platos/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify(plato),
    })

    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(data?.message ?? `Error ${response.status} al actualizar el plato`)
    }
    // El backend responde 200 con {message} si el plato no existe (no es 404).
    if (!data?.plato) {
        throw new Error(data?.message ?? 'No se encontró el plato para actualizar')
    }

    return {
        ...data,
        plato: normalizarPlatoObtener(data.plato as PlatoConIngredientesJSON),
    }
}

// PUT "enfocado" que solo alterna la disponibilidad desde la tarjeta del
// hub: el backend valida los campos requeridos pero el service no toca el
// pivot de ingredientes si la key viene ausente (el PUT puede ser solo
// para cambiar un flag), y `imagen` es nullable.
export async function cambiarDisponibilidad(plato: PlatoListar, disponible: boolean): Promise<PlatoResponse> {
    const response = await fetch(`${API_BASE_URL}/platos/${plato.id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
            categoria_id: plato.categoria_id,
            promocion_id: plato.promocion_id,
            nombre: plato.nombre,
            descripcion: plato.descripcion,
            precio: plato.precio,
            imagen: plato.imagen,
            disponible,
        }),
    })

    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, `Error ${response.status} al actualizar el plato`))
    }
    if (!data?.plato) {
        throw new Error(data?.message ?? 'No se encontró el plato para actualizar')
    }

    return {
        ...data,
        plato: normalizarPlatoObtener(data.plato as PlatoConIngredientesJSON),
    }
}

export async function createPlato(plato: PlatoInput, signal?: AbortSignal): Promise<PlatoResponse> {
    const response = await fetch(`${API_BASE_URL}/platos`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify(plato),
        signal
    })

    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, `Error ${response.status} al crear el plato`))
    }

    return {
        ...data,
        plato: normalizarPlatoObtener(data.plato as PlatoConIngredientesJSON),
    }
}

export async function deletePlato(id: number, signal?: AbortSignal): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/platos/${id}`, {
        method: 'DELETE',
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
        },
        signal,
    })

    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, `Error ${response.status} al eliminar el plato`))
    }

    return { message: data?.message ?? 'Plato eliminado exitosamente' }
}