import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ContextoCliente, type CambiosLinea, type ContextoCliente as TipoContexto } from './useCliente'
import { agregarLineasCliente, confirmarLineasCliente, ErrorCliente, getPedidosCliente } from '../../api/cliente'
import type { AltaPedidosMesa, LineaPedidoAlta } from '../../api/pedidos'
import type { ClienteMesa, LineaBorrador, SesionCliente } from '../../types/Cliente'
import { importeLinea } from '../../utils/borrador'

const CLAVE_STORAGE = 'gastro_cliente'

function leerSesion(): SesionCliente | null {
    try {
        const raw = localStorage.getItem(CLAVE_STORAGE)
        if (!raw) return null
        const datos = JSON.parse(raw) as Partial<SesionCliente>
        if (!datos.mesa?.codigo_acceso || !Array.isArray(datos.borrador)) return null
        return {
            mesa: datos.mesa,
            pedidoIds: Array.isArray(datos.pedidoIds) ? datos.pedidoIds : [],
            confirmarPendiente: Boolean(datos.confirmarPendiente),
            borrador: datos.borrador,
        }
    } catch {
        return null
    }
}

// Identidad de una línea: mismo plato + mismas opciones = misma clave
// (se suman cantidades); opciones distintas = línea aparte (nunca se
// combinan, aunque alteraría el pedido).
function claveLinea(platoId: number, ingredientes: number[], excluir: number[]): string {
    const ordenar = (ids: number[]) => [...ids].sort((a, b) => a - b)
    return `${platoId}|${ordenar(ingredientes).join(',')}|${ordenar(excluir).join(',')}`
}

export function ClienteProvider({ children }: { children: ReactNode }) {
    const [sesionInicial] = useState<SesionCliente | null>(leerSesion)
    const [sesion, setSesion] = useState<SesionCliente | null>(sesionInicial)
    const [resumen, setResumen] = useState<TipoContexto['resumen']>(null)
    const [revalidando, setRevalidando] = useState(sesionInicial !== null)

    // Al recargar: si había un código guardado, se revalida contra el
    // backend. Solo un 401/403 (código muerto) limpia la sesión local;
    // un fallo de red conserva el borrador para no perder el pedido.
    useEffect(() => {
        if (!sesionInicial) return
        let cancelado = false
        getPedidosCliente(sesionInicial.mesa.codigo_acceso)
            .catch((error: unknown) => {
                if (cancelado) return
                if (error instanceof ErrorCliente && (error.status === 401 || error.status === 403)) {
                    setSesion(null)
                    setResumen(null)
                }
            })
            .finally(() => {
                if (!cancelado) setRevalidando(false)
            })
        return () => {
            cancelado = true
        }
    }, [sesionInicial])

    useEffect(() => {
        if (sesion) {
            localStorage.setItem(CLAVE_STORAGE, JSON.stringify(sesion))
        } else {
            localStorage.removeItem(CLAVE_STORAGE)
        }
    }, [sesion])

    const aplicarIdentificacion = useCallback((mesa: ClienteMesa) => {
        setSesion(prev => {
            if (prev && prev.mesa.id === mesa.id) {
                // Misma mesa: se conservan borrador y pedidos enviados;
                // solo se refresca el estado/código de la mesa.
                return { ...prev, mesa }
            }
            // Mesa nueva (o primera): arranca limpio. La página ya
            // confirmó con el usuario el descarte del borrador anterior.
            return { mesa, pedidoIds: [], confirmarPendiente: false, borrador: [] }
        })
        setResumen(null)
    }, [])

    const agregarLinea = useCallback((linea: Omit<LineaBorrador, 'clave'>) => {
        setSesion(prev => {
            if (!prev) return prev
            const clave = claveLinea(linea.plato.id, linea.ingredientes, linea.excluir)
            const existente = prev.borrador.find(l => l.clave === clave)
            const borrador = existente
                ? prev.borrador.map(l => l.clave === clave ? { ...l, cantidad: l.cantidad + linea.cantidad } : l)
                : [...prev.borrador, { ...linea, clave }]
            return { ...prev, borrador }
        })
    }, [])

    const editarLinea = useCallback((clave: string, cambios: CambiosLinea) => {
        setSesion(prev => {
            if (!prev) return prev
            const original = prev.borrador.find(l => l.clave === clave)
            if (!original) return prev
            const nueva: LineaBorrador = {
                ...original,
                ...cambios,
                clave: claveLinea(original.plato.id, cambios.ingredientes, cambios.excluir),
            }
            const sinOriginal = prev.borrador.filter(l => l.clave !== clave)
            // Si al editar quedó idéntica a otra línea, se suman cantidades.
            const dupe = sinOriginal.find(l => l.clave === nueva.clave)
            const borrador = dupe
                ? sinOriginal.map(l => l.clave === nueva.clave ? { ...l, cantidad: l.cantidad + nueva.cantidad } : l)
                : [...sinOriginal, nueva]
            return { ...prev, borrador }
        })
    }, [])

    const eliminarLinea = useCallback((clave: string) => {
        setSesion(prev => prev
            ? { ...prev, borrador: prev.borrador.filter(l => l.clave !== clave) }
            : prev)
    }, [])

    const cancelarBorrador = useCallback(() => {
        setSesion(prev => prev ? { ...prev, borrador: [] } : prev)
    }, [])

    const enviar = useCallback(async () => {
        if (!sesion) {
            throw new Error('Identificá tu mesa antes de enviar el pedido.')
        }
        if (sesion.borrador.length === 0) {
            throw new Error('No podés enviar un pedido vacío.')
        }
        const codigo = sesion.mesa.codigo_acceso
        const platos: LineaPedidoAlta[] = sesion.borrador.map(linea => ({
            plato_id: linea.plato.id,
            cantidad: linea.cantidad,
            ...(linea.ingredientes.length > 0 ? { ingredientes: linea.ingredientes } : {}),
            ...(linea.excluir.length > 0 ? { excluir: linea.excluir } : {}),
        }))

        // Recuperación: las líneas ya están en el server pero falló la
        // confirmación → solo se reintenta la confirmación (sin duplicar).
        let pedidoId = sesion.pedidoIds[sesion.pedidoIds.length - 1] ?? null
        if (sesion.confirmarPendiente && pedidoId != null) {
            await confirmarLineasCliente(codigo, pedidoId)
            setSesion(prev => prev ? { ...prev, confirmarPendiente: false, borrador: [] } : prev)
            return
        }

        if (pedidoId == null) {
            const alta = await agregarLineasCliente(codigo, { platos } satisfies AltaPedidosMesa)
            pedidoId = alta.pedidoId
            setSesion(prev => prev ? { ...prev, pedidoIds: [...prev.pedidoIds, alta.pedidoId], confirmarPendiente: true } : prev)
        } else {
            try {
                await agregarLineasCliente(codigo, { platos, pedido_id: pedidoId })
                setSesion(prev => prev ? { ...prev, confirmarPendiente: true } : prev)
            } catch (error) {
                // 422 = el pedido anterior ya no está en curso (lo cerró
                // el mozo): se crea una raíz nueva para esta tanda.
                if (!(error instanceof ErrorCliente) || error.status !== 422) throw error
                const alta = await agregarLineasCliente(codigo, { platos })
                pedidoId = alta.pedidoId
                setSesion(prev => prev ? { ...prev, pedidoIds: [...prev.pedidoIds, alta.pedidoId], confirmarPendiente: true } : prev)
            }
        }

        await confirmarLineasCliente(codigo, pedidoId)
        setSesion(prev => prev ? { ...prev, confirmarPendiente: false, borrador: [] } : prev)
    }, [sesion])

    const recargarResumen = useCallback(async () => {
        if (!sesion) return
        try {
            const nuevo = await getPedidosCliente(sesion.mesa.codigo_acceso)
            setResumen(nuevo)
        } catch (error) {
            if (error instanceof ErrorCliente && (error.status === 401 || error.status === 403)) {
                setSesion(null)
                setResumen(null)
            }
            throw error
        }
    }, [sesion])

    const borrador = useMemo(() => sesion?.borrador ?? [], [sesion])
    const valor = useMemo<TipoContexto>(() => ({
        mesa: sesion?.mesa ?? null,
        mesaIdentificada: sesion !== null,
        borrador,
        cantidadBorrador: borrador.reduce((acum, linea) => acum + linea.cantidad, 0),
        totalBorrador: borrador.reduce((acum, linea) => acum + importeLinea(linea), 0),
        pedidoIds: sesion?.pedidoIds ?? [],
        resumen,
        revalidando,
        aplicarIdentificacion,
        agregarLinea,
        editarLinea,
        eliminarLinea,
        cancelarBorrador,
        enviar,
        recargarResumen,
    }), [
        sesion, borrador, resumen, revalidando,
        aplicarIdentificacion, agregarLinea, editarLinea, eliminarLinea,
        cancelarBorrador, enviar, recargarResumen,
    ])

    return <ContextoCliente.Provider value={valor}>{children}</ContextoCliente.Provider>
}
