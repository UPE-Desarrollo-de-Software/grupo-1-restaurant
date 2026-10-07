export interface Ingrediente {
  id: number;
  nombre: string;
}

export interface Producto {
  id: number;
  categoria_nombre: string;
  categoria_id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  imagen: string;
  disponible: number;
}
