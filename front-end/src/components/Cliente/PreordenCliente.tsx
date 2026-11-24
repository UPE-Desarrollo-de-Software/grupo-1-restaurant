import { useMemo, useState } from 'react'
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap'
import { usePlatos } from '../../hooks/usePlatos'
import type { LineaPreorden } from '../../types/Reserva'
import { coincideTexto, normalizarTexto } from '../../utils/busqueda'
import s from './PreordenCliente.module.css'

// Los precios/promos NO viajan en la pre-orden: se recalculan al
// convertirla en pedido, así que el total de acá es solo estimado.
const formatearPrecio = (precio: number): string =>
    new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
    }).format(precio)

interface PreordenClienteProps {
    /** Líneas del carrito (controlado por la página que lo usa). */
    lineas: LineaPreorden[]
    onChange: (lineas: LineaPreorden[]) => void
    /** Deshabilita los controles (p. ej. mientras se guarda). */
    disabled?: boolean
}

interface StepperProps {
    cantidad: number
    nombre: string
    disabled: boolean
    /** Sin plato en carta no se suma más (el back lo rechazaría al guardar). */
    puedeSumar: boolean
    onQuitar: () => void
    onSumar: () => void
}

function Stepper({ cantidad, nombre, disabled, puedeSumar, onQuitar, onSumar }: StepperProps) {
    return (
        <div className={s.stepper}>
            <button
                type='button'
                className={s.paso}
                aria-label={`Quitar uno de ${nombre}`}
                disabled={disabled || cantidad === 0}
                onClick={onQuitar}
            >
                <i className='bi bi-dash-lg' aria-hidden='true' />
            </button>
            <span className={`text-label-lg ${s.cantidad}`} aria-live='polite'>{cantidad}</span>
            <button
                type='button'
                className={s.paso}
                aria-label={`Agregar uno de ${nombre}`}
                disabled={disabled || !puedeSumar}
                onClick={onSumar}
            >
                <i className='bi bi-plus-lg' aria-hidden='true' />
            </button>
        </div>
    )
}

// Carrito de pre-orden: resumen de las líneas elegidas + modal con la
// carta para sumar/quitar platos (GET /platos trae solo los activos).
// Componente CONTROLADO: no persiste nada solo — la página decide cuándo
// llamar a la API (alta con la reserva, o DELETE + PUT por PIN).
export function PreordenCliente({ lineas, onChange, disabled = false }: PreordenClienteProps) {
    const { platos, loading, error } = usePlatos()
    const [abierto, setAbierto] = useState(false)
    const [busqueda, setBusqueda] = useState('')

    const porId = useMemo(() => new Map(platos.map(plato => [plato.id, plato])), [platos])

    const cantidadTotal = lineas.reduce((suma, linea) => suma + linea.cantidad, 0)
    // Estimado informativo: los platos que ya no están en la carta
    // (deshabilitados) se cuentan a 0 y se marcan como no disponibles.
    const totalEstimado = lineas.reduce(
        (suma, linea) => suma + (porId.get(linea.plato_id)?.precio ?? 0) * linea.cantidad,
        0,
    )

    function cambiarCantidad(platoId: number, cantidad: number) {
        if (cantidad <= 0) {
            onChange(lineas.filter(linea => linea.plato_id !== platoId))
            return
        }
        onChange(
            lineas.some(linea => linea.plato_id === platoId)
                ? lineas.map(linea => (linea.plato_id === platoId ? { ...linea, cantidad } : linea))
                : [...lineas, { plato_id: platoId, cantidad }],
        )
    }

    const consulta = normalizarTexto(busqueda.trim())
    const catalogo = consulta === ''
        ? platos
        : platos.filter(
            plato => coincideTexto(plato.nombre, consulta) || coincideTexto(plato.descripcion, consulta),
        )

    return (
        <div className={s.contenedor}>
            <div className={s.encabezado}>
                <div className={s.textos}>
                    <h3 className={`text-headline-sm ${s.titulo}`}>Pre-orden (opcional)</h3>
                    <p className={`text-body-sm ${s.descripcion}`}>
                        Elegí lo que querés que te esté esperando al llegar. El pedido se envía
                        a cocina solo, cuando tu mesa esté lista.
                    </p>
                </div>
                <Button
                    type='button'
                    variant='outline-primary'
                    size='sm'
                    className='text-label-md'
                    onClick={() => setAbierto(true)}
                    disabled={disabled}
                >
                    <i className='bi bi-plus-lg me-1' aria-hidden='true' />
                    {lineas.length > 0 ? 'Agregar más' : 'Elegir platos'}
                </Button>
            </div>

            {lineas.length === 0 ? (
                <p className={`text-body-sm ${s.vacio}`}>
                    Todavía no elegiste nada. Podés reservar igual y armarla después con tu PIN.
                </p>
            ) : (
                <>
                    <ul className={s.lineas}>
                        {lineas.map(linea => {
                            const plato = porId.get(linea.plato_id)
                            return (
                                <li key={linea.plato_id} className={s.linea}>
                                    <div className={s.lineaTexto}>
                                        <span className={`text-body-md ${s.lineaNombre}`}>
                                            {plato?.nombre ?? 'Plato fuera de carta'}
                                        </span>
                                        <span className={`text-body-sm ${s.lineaPrecio}`}>
                                            {plato ? `${formatearPrecio(plato.precio)} c/u` : 'Ya no está disponible'}
                                        </span>
                                    </div>
                                    <Stepper
                                        cantidad={linea.cantidad}
                                        nombre={plato?.nombre ?? 'este plato'}
                                        disabled={disabled}
                                        puedeSumar={plato !== undefined}
                                        onQuitar={() => cambiarCantidad(linea.plato_id, linea.cantidad - 1)}
                                        onSumar={() => cambiarCantidad(linea.plato_id, linea.cantidad + 1)}
                                    />
                                </li>
                            )
                        })}
                    </ul>

                    <div className={s.resumen}>
                        <span className={`text-body-md ${s.resumenCantidad}`}>
                            {cantidadTotal} {cantidadTotal === 1 ? 'plato' : 'platos'} en tu pre-orden
                        </span>
                        <span className={`text-price-display ${s.resumenTotal}`}>
                            {formatearPrecio(totalEstimado)}{' '}
                            <small className={`text-body-sm ${s.estimado}`}>estimado</small>
                        </span>
                    </div>

                    <p className={`text-body-sm ${s.nota}`}>
                        Los precios se confirman al llegar, con la carta del día.
                    </p>
                </>
            )}

            <Modal
                show={abierto}
                onHide={() => setAbierto(false)}
                centered
                aria-labelledby='preorden-titulo-modal'
            >
                <Modal.Header closeButton>
                    <Modal.Title id='preorden-titulo-modal' className='text-headline-sm'>
                        Elegí tus platos
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Control
                        type='search'
                        aria-label='Buscar plato'
                        placeholder='Buscar por nombre o descripción…'
                        className='text-body-md mb-3'
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                    />

                    {loading && (
                        <p className={`text-body-sm d-flex align-items-center gap-2 ${s.estado}`}>
                            <Spinner size='sm' animation='border' />
                            Cargando la carta…
                        </p>
                    )}
                    {error && (
                        <Alert variant='danger' className={`text-body-sm ${s.estado}`}>{error}</Alert>
                    )}
                    {!loading && !error && catalogo.length === 0 && (
                        <p className={`text-body-sm ${s.estado}`}>
                            No hay platos que coincidan con la búsqueda.
                        </p>
                    )}

                    {catalogo.length > 0 && (
                        <ul className={s.catalogo}>
                            {catalogo.map(plato => {
                                const linea = lineas.find(l => l.plato_id === plato.id)
                                return (
                                    <li key={plato.id} className={s.linea}>
                                        <div className={s.lineaTexto}>
                                            <span className={`text-body-md ${s.lineaNombre}`}>{plato.nombre}</span>
                                            <span className={`text-body-sm ${s.lineaPrecio}`}>
                                                {formatearPrecio(plato.precio)}
                                            </span>
                                        </div>
                                        <Stepper
                                            cantidad={linea?.cantidad ?? 0}
                                            nombre={plato.nombre}
                                            disabled={disabled}
                                            puedeSumar
                                            onQuitar={() => cambiarCantidad(plato.id, (linea?.cantidad ?? 0) - 1)}
                                            onSumar={() => cambiarCantidad(plato.id, (linea?.cantidad ?? 0) + 1)}
                                        />
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        type='button'
                        variant='primary'
                        className='text-label-md'
                        onClick={() => setAbierto(false)}
                    >
                        Listo ({cantidadTotal} {cantidadTotal === 1 ? 'plato' : 'platos'})
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    )
}
