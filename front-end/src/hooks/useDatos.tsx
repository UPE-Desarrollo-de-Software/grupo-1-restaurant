import { useEffect, useState } from "react";
import { getPlatos } from "../api/platos";
import { getIngredientes } from "../api/ingredientes";
import type { Categoria, Ingrediente, PlatoListar } from "../types/Menu";
import { getCategorias } from "../api/categorias";


export type Tipo = 'plato' | 'categoria' | 'ingrediente'
export type ItemLista = PlatoListar | Ingrediente | Categoria   // unión, no genérico

const FETCHERS: Record<Tipo, (signal?: AbortSignal) => Promise<ItemLista[]>> = {
  plato: getPlatos,
  categoria: getCategorias,
  ingrediente: getIngredientes,
}

export function useDatos(tipo: Tipo) {
  const [items, setItems] = useState<ItemLista[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    FETCHERS[tipo](controller.signal)
      .then(setItems)
      .catch(err => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Error desconocido al cargar la lista')
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [tipo])

  return { items, loading, error }
}