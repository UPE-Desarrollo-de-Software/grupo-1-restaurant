import z from "zod";
import type { categoriaSchema, ingredienteSchema, platoSchema, promocionSchema } from "../schemas/carta";

export type TipoPromocion = 'porcentaje' | 'monto_fijo' | 'precio_fijo' | '2x1'

export interface Promocion {
    id: number
    nombre: string
    tipo: TipoPromocion
    // decimal sin cast en el backend: llega string, se normaliza a number en la capa API.
    // null en tipo '2x1'.
    valor: number | null
    fecha_inicio: string | null
    fecha_fin: string | null
    activo: boolean
}

export type PromocionInput = z.infer<typeof promocionSchema>
export type PromocionResponse = {
    message: string,
    promocion: Promocion
}

export interface PlatoListar {
  id: number;
  categoria_nombre: string;
  categoria_id: number;
  promocion_id: number | null;
  // Oferta vigente en la carta: el backend anula la relación si la promo no está vigente.
  promocion: Promocion | null;
  nombre: string;
  descripcion: string;
  precio: number;
  imagen: string | null;
  disponible: boolean;
}

export interface Ingrediente {
    id: number,
    nombre: string,
    precioAdicional: number
}

// Ingrediente de un plato (GET/POST/PUT de platos): incluye los flags del pivot
// `plato_ingrediente` (llegan 1/0, se normalizan a boolean en la capa API).
export interface IngredientePlato extends Ingrediente {
    pivot: {
        opcional: boolean
        por_defecto: boolean
    }
}

export type IngredienteInput = z.infer<typeof ingredienteSchema>
export type IngredienteResponse = {
    message: string,
    ingrediente: Ingrediente
}

export interface PlatoObtener {
    id: number;
    categoria_id: number;
    promocion_id: number | null;
    // Cargada en GET /platos/{id}; las respuestas de POST/PUT solo traen promocion_id.
    promocion?: Promocion | null;
    nombre: string;
    descripcion: string;
    precio: number;
    imagen: string | null;
    disponible: boolean;
    ingredientes: IngredientePlato[]
}

export type PlatoInput = z.infer<typeof platoSchema>
export type PlatoResponse = {
    message: string,
    plato: PlatoObtener
}

export interface Categoria {
    id: number
    nombre: string
    descripcion: string,
    activo: boolean
}

export type CategoriaInput = z.infer<typeof categoriaSchema>
export type CategoriaResponse ={
    message: string,
    categoria: Categoria
}