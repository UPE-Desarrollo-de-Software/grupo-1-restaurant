import { normalizarTexto } from './busqueda'

/* ============================================================
   Color de categoría (Diseño 2.0)
   ------------------------------------------------------------
   El borde izquierdo de cada card de plato identifica la
   categoría. La asignación se resuelve acá, en el front: un
   mapeo nombre-de-categoría → clave de paleta. Una categoría
   sin entrada (creada después por el gerente) cae al tono por
   defecto (`secundario`).

   Este archivo NO define colores: devuelve la clave y el CSS
   (PlatoCard.module.css) la resuelve a un token de tokens.css
   vía `data-categoria`, igual que el patrón `data-tono` que ya
   usa ConfiguradorIngredientes. Así no hay colores
   hardcodeados en TypeScript.
   ============================================================ */

export type TonoCategoria =
  | 'primario'
  | 'primario-claro'
  | 'secundario'
  | 'terciario'
  | 'terciario-claro'
  | 'neutro'

// Categorías del seed del backend (CategoriaSeeder) + las habituales de
// una carta, para que cada una tenga un color propio y estable. El resto
// usa el tono por defecto.
const MAPA_COLORES: Record<string, TonoCategoria> = {
  'entradas': 'secundario',
  'platos principales': 'primario',
  'pizzas': 'terciario',
  'hamburguesas': 'primario-claro',
  'postres': 'terciario-claro',
  'bebidas': 'neutro',
  'ensaladas': 'secundario',
  // Nombres alternativos frecuentes.
  'milanesas': 'primario',
  'carnes': 'terciario',
  'pastas': 'primario-claro',
  'minutas': 'primario',
  'guarniciones': 'secundario',
  'vinos': 'neutro',
  'tragos': 'terciario-claro',
  'cafeteria': 'terciario',
  'desayunos': 'terciario-claro',
}

// Categoría sin color asignado → color secundario del proyecto.
export const TONO_CATEGORIA_DEFECTO: TonoCategoria = 'secundario'

// El nombre llega tal cual de la API ("Platos principales"): se normaliza
// (minúsculas + sin acentos) para que el mapeo no dependa de tildes ni
// mayúsculas. Una categoría sin entrada cae al tono por defecto.
export function tonoCategoria(nombre: string): TonoCategoria {
  return MAPA_COLORES[normalizarTexto(nombre.trim())] ?? TONO_CATEGORIA_DEFECTO
}
