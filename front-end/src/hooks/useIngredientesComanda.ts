import { useEffect, useMemo, useRef, useState } from 'react'
import { getPlato } from '../api/platos'
import type { PlatoObtener } from '../types/Menu'
import type { LineaCocina } from '../types/Mesa'

// Recetas de los platos de una comanda. GET /cocina/pedidos no incluye
// `plato.ingredientes`, así que se piden a GET /platos/{id} (público) una
// sola vez por plato distinto y se cachean. Si falla una receta, la línea
// muestra el aviso y el detalle ofrece reintentar.
//
// Los sets van en callbacks async (regla set-state-in-effect): el body del
// efecto sólo dispara los fetches y aborta al desmontar.
export function useIngredientesComanda(lineas: LineaCocina[]) {
    const [recetas, setRecetas] = useState<Record<number, PlatoObtener>>({})
    const [fallidos, setFallidos] = useState<Set<number>>(() => new Set())
    const [intento, setIntento] = useState(0)
    const controllerRef = useRef<AbortController | null>(null)

    const clavePlatos = useMemo(
        () => Array.from(new Set(lineas.map(linea => linea.plato_id).filter(id => id > 0))).join(','),
        [lineas],
    )

    useEffect(() => {
        const ids = clavePlatos ? clavePlatos.split(',').map(Number) : []
        if (ids.length === 0) return

        controllerRef.current?.abort()
        const controller = new AbortController()
        controllerRef.current = controller

        Promise.allSettled(ids.map(id => getPlato(id, controller.signal)))
            .then(resultados => {
                if (controller.signal.aborted) return

                const nuevas: Record<number, PlatoObtener> = {}
                const fallos = new Set<number>()

                resultados.forEach((resultado, indice) => {
                    const id = ids[indice]
                    if (resultado.status === 'fulfilled') {
                        nuevas[id] = resultado.value
                    } else {
                        fallos.add(id)
                    }
                })

                setRecetas(previas => ({ ...previas, ...nuevas }))
                setFallidos(previos => {
                    const siguientes = new Set(previos)
                    ids.forEach(id => siguientes.delete(id))
                    fallos.forEach(id => siguientes.add(id))
                    return siguientes
                })
            })

        return () => controller.abort()
    }, [clavePlatos, intento])

    return {
        recetas,
        fallidos,
        reintentar: () => {
            setFallidos(new Set())
            setIntento(valor => valor + 1)
        },
    }
}
