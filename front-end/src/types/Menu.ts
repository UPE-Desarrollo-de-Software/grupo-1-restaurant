import z from "zod";
import type { categoriaSchema, ingredienteSchema, platoSchema } from "../schemas/menu";

export interface PlatoListar {
  id: number;
  categoria_nombre: string;
  categoria_id: number;
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

export type IngredienteInput = z.infer<typeof ingredienteSchema>
export type IngredienteResponse = {
    message: string,
    ingrediente: Ingrediente
}

export interface PlatoObtener {
    id: number;
    categoria_id: number;
    nombre: string;
    descripcion: string;
    precio: number;
    imagen: string | null;
    disponible: boolean;
    ingredientes: Ingrediente[]
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