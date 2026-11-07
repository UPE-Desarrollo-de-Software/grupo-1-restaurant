import { useEffect, useState } from 'react'
import { Spinner } from 'react-bootstrap'
import { getPlato } from '../../api/platos'
import { useCliente } from '../../context/ClienteContext/useCliente'
import type { PlatoListar, PlatoObtener } from '../../types/Menu'
import { PersonalizarPlatoModal } from './PersonalizarPlatoModal'
import s from './BotonAgregarPlato.module.css'

// "+ Agregar" de la tarjeta de la Carta: SOLO se muestra con la mesa
// identificada (sin mesa no hay forma de armar un pedido). Al usarlo:
// si el plato no tiene ingredientes entra directo al borrador; si los
// tiene, abre el modal de personalización con el detalle ya cargado.
export function BotonAgregarPlato({ plato }: { plato: PlatoListar }) {
    const { mesaIdentificada, agregarLinea } = useCliente()

    const [buscando, setBuscando] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [agregado, setAgregado] = useState(false)
    const [detalle, setDetalle] = useState<PlatoObtener | null>(null)
    const [mostrarModal, setMostrarModal] = useState(false)

    // Feedback "✓ Agregado": se autolimpia para no dejar estado pegado.
    useEffect(() => {
        if (!agregado) return
        const temporizador = setTimeout(() => setAgregado(false), 1800)
        return () => clearTimeout(temporizador)
    }, [agregado])

    if (!mesaIdentificada || !plato.disponible) return null

    async function manejarClic() {
        setBuscando(true)
        setError(null)
        try {
            const obtenido = await getPlato(plato.id)
            if (obtenido.ingredientes.length > 0) {
                setDetalle(obtenido)
                setMostrarModal(true)
                return
            }
            agregarLinea({
                plato: {
                    id: obtenido.id,
                    nombre: obtenido.nombre,
                    imagen: obtenido.imagen,
                    precio: Number(obtenido.precio),
                },
                cantidad: 1,
                ingredientes: [],
                excluir: [],
                opciones: {},
            })
            setAgregado(true)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo agregar el plato al pedido')
        } finally {
            setBuscando(false)
        }
    }

    return (
        <div className={s.contenedor}>
            <button
                type='button'
                className={`btn btn-sm text-label-md ${s.boton} ${agregado ? s.botonExito : 'btn-primary'}`}
                disabled={buscando}
                aria-label={`Agregar ${plato.nombre} al pedido`}
                onClick={manejarClic}
            >
                {buscando
                    ? <Spinner size='sm' animation='border' />
                    : agregado
                        ? <><i className='bi bi-check2 me-1' aria-hidden='true' />Agregado</>
                        : '+ Agregar'}
            </button>

            {error && <span role='alert' className={`text-body-sm ${s.error}`}>{error}</span>}

            <PersonalizarPlatoModal
                show={mostrarModal}
                plato={plato}
                detallePrecargado={detalle}
                onCerrar={() => {
                    setMostrarModal(false)
                    setDetalle(null)
                }}
                onGuardado={() => setAgregado(true)}
            />
        </div>
    )
}
