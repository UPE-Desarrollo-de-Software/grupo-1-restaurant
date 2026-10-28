// Mínimo de mesa que necesita el front (select de alta de reserva y
// la relación `mesa` de una reserva). El backend trae más campos
// (codigo_acceso, etc.); jamás se muestran en la UI pública.

import z from "zod";
import type { mesaSchema } from "../schemas/mesas";

export type MesaInput = z.infer<typeof mesaSchema>

export interface Mesa {
    id: number
    capacidad: number
    estado: string
    usuario_id?: number | null
    grupo_codigo?: number | null
    ocupada_desde?: string | null
}

// Única fuente del PIN en el front: GET /mesas/{id} y la respuesta de
// ocupar. La lista (GET /mesas) sigue sin traerlo.
export interface MesaConCodigo extends Mesa {
    codigo_acceso: string
}

// ==== Comanda y cuenta de la visita actual (Gerente) ====
// Shapes espejo de MesaService::resumen() y MesaService::cuenta().

export interface PromocionLinea {
    id: number
    nombre: string
    tipo: string
}

export interface LineaCuenta {
    detalle_id: number
    pedido_id: number
    plato: string
    descuento: number
    promocion: PromocionLinea | null
    cantidad: number
    subtotal: number
}

// Cada PEDIDO RAÍZ es una "parte" (lo que paga una persona) y acumula
// sus hijos (repeticiones de esa misma persona).
export interface ParteCuenta {
    pedido_id: number
    pedido_ids: number[]
    subtotal: number
    lineas: LineaCuenta[]
}

export interface CuentaMesa {
    mesa_id: number
    codigo_acceso: string
    ocupada_desde: string | null
    partes: ParteCuenta[]
    total: number
    grupo?: CuentaMesa[]
}

export interface LineaPedidoResumen {
    detalle_id: number
    plato: string
    promocion: PromocionLinea | null
    cantidad: number
    descuento: number
    subtotal: number
    confirmado: boolean
}

// Estados del DER para PEDIDO (8). Tramo del mozo: en_curso →
// (confirmar) → confirmado → (enviar) → enviado; luego la COCINA avanza
// enviado → en_preparacion → listo (PUT /cocina/pedidos/{id}/estado);
// y el mozo cierra listo → entregado → cerrado. Cancelado desde
// cualquier estado no final (exclusivo del mozo).
export type EstadoPedido =
    | 'en_curso'
    | 'confirmado'
    | 'enviado'
    | 'en_preparacion'
    | 'listo'
    | 'entregado'
    | 'cerrado'
    | 'cancelado'

export interface PedidoResumen {
    id: number
    pedido_padre_id: number | null
    estado: string
    total: number
    fecha: string
    lineas: LineaPedidoResumen[]
    todas_confirmadas: boolean
}

export interface HermanaResumen {
    mesa_id: number
    codigo_acceso: string
    pedido_estado: string | null
}

export interface ResumenMesa {
    mesa_id: number
    codigo_acceso: string
    encontrada: boolean
    pedidos: PedidoResumen[]
    grupo?: HermanaResumen[]
}

// ==== Cola de cocina (GET /cocina/pedidos) ====
// Espejo de ListarPedidosCocinaUseCase: pedidos `enviado` y
// `en_preparacion` de todas las mesas, con sus líneas (líneas ya
// normalizadas por la capa de API: números y nombres planos).

export interface LineaCocina {
    detalle_id: number
    plato: string
    promocion: PromocionLinea | null
    cantidad: number
    subtotal: number
    // Personalizaciones por línea: "Sin lechuga", "Extra cheddar"…
    excluir: string[]
    agregar: string[]
}

export interface PedidoCocina {
    id: number
    mesa_id: number
    estado: EstadoPedido
    total: number
    fecha: string
    mesa_capacidad: number
    lineas: LineaCocina[]
}
