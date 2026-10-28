import { useCallback, useEffect, useState } from "react";
import { getPlatosTodos } from "../api/platos";
import { getIngredientes } from "../api/ingredientes";
import type { Categoria, Ingrediente, PlatoListar, Promocion } from "../types/Menu";
import type { Reserva } from "../types/Reserva";
import type { Mesa } from "../types/Mesa";
import type { Usuario } from "../types/Auth";
import { getCategorias } from "../api/categorias";
import { getUsuarios } from "../api/usuarios";
import { getPromociones } from "../api/promociones";
import { getReservas } from "../api/reservas";
import { getMesas } from "../api/mesas";


export type Tipo = 'plato' | 'categoria' | 'ingrediente' | 'usuario' | 'promocion' | 'reserva' | 'mesa'
export type ItemLista = PlatoListar | Ingrediente | Categoria | Usuario | Promocion | Reserva | Mesa   // unión, no genérico

const FETCHERS: Record<Tipo, (signal?: AbortSignal) => Promise<ItemLista[]>> = {
  // El panel de gestión necesita TODOS los platos (con pausados);
  // GET /platos (público) devuelve solo los disponibles.
  plato: getPlatosTodos,
  categoria: getCategorias,
  ingrediente: getIngredientes,
  usuario: getUsuarios,
  promocion: getPromociones,
  reserva: getReservas,
  mesa: getMesas,
}

export function useDatos(tipo: Tipo) {
  const [items, setItems] = useState<ItemLista[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Extraída del effect para poder esperarla (recargar() → Promise):
  // los sets van siempre en callbacks (regla react-hooks/set-state-in-effect).
  // Resuelva como resuelva (los errores caen al estado `error`); así un
  // `await onCambio()` después de una mutación exitosa nunca la hace fallar.
  const cargar = useCallback((signal?: AbortSignal): Promise<void> => {
    return FETCHERS[tipo](signal)
      // El success limpia errores de corridas anteriores (recargar()).
      .then(lista => {
        setItems(lista)
        setError(null)
      })
      .catch(err => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Error desconocido al cargar la lista')
      })
      .finally(() => setLoading(false))
  }, [tipo])

  useEffect(() => {
    const controller = new AbortController()
    cargar(controller.signal)
    return () => controller.abort()
  }, [cargar])

  // Recarga puntual tras una acción (ocupar, agrupar, alternar…):
  // vuelve a pedir la lista y puede esperarse con await. No toca `loading`
  // (la lista ya está en pantalla; sin flash de "Cargando…").
  const recargar = (): Promise<void> => cargar()

  return { items, loading, error, recargar }
}
