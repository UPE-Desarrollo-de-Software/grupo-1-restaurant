import z from "zod";
import type { productoSchema } from "../schemas/menu";

export interface ProductoListar {
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
    opcional: boolean,
    precioAdicional: number
}

export interface ProductoObtener {
    id: number;
    categoria_id: number;
    nombre: string;
    descripcion: string;
    precio: number;
    imagen: string | null;
    disponible: boolean;
    ingredientes: { id: number; nombre: string }[] 
}

export type ProductoInput = z.infer<typeof productoSchema>
export type ProductoResponse = {
    message: string,
    producto: ProductoObtener
}

export interface Categoria {
    id: number
    nombre: string
    descripcion: string,
    activo: boolean
}