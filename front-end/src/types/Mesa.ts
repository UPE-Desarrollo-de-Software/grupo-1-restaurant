// Mínimo de mesa que necesita el front (select de alta de reserva y
// la relación `mesa` de una reserva). `codigo_acceso` llega en el
// listado de mesas (GET /mesas) y se muestra en los paneles internos
// (gerente y mozo); nunca en la UI pública del comensal.

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
    // PIN de 4 dígitos (string, preserva ceros a la izquierda). Opcional
    // porque no todas las respuestas lo traen (ej. relaciones anidadas).
    codigo_acceso?: string | null
}

// Variante con el PIN obligatorio: GET /mesas/{id} y la respuesta de
// crear/ocupar.
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

export type TipoPersonalizacionLinea = 'excluido' | 'agregado'

// Excepción guardada por el backend (`detalle_pedido_ingrediente`): no es
// la receta completa del plato, sólo lo que el cliente quitó o agregó.
export interface PersonalizacionLinea {
    ingrediente_id: number
    nombre: string
    tipo: TipoPersonalizacionLinea
}

export interface LineaCocina {
    detalle_id: number
    // Necesario para pedir la receta del plato (GET /platos/{id}).
    plato_id: number
    plato: string
    promocion: PromocionLinea | null
    cantidad: number
    subtotal: number
    // Personalizaciones por línea: "Sin lechuga", "Extra cheddar"…
    personalizaciones: PersonalizacionLinea[]
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
