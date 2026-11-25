import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Alert, Button, Form, Offcanvas, Spinner } from 'react-bootstrap'
import { getPlato } from '../../api/platos'
import { useCliente } from '../../context/ClienteContext/useCliente'
import type { LineaBorrador, OpcionBorrador } from '../../types/Cliente'
import type { PlatoListar, PlatoObtener } from '../../types/Menu'
import s from './PersonalizarPlatoModal.module.css'

// Panel inferior (bottom sheet) de personalización de una línea: agregar
// desde la Carta o editar desde Mi pedido. Misma semántica de ingredientes
// que la toma de pedido del mozo (TomarPedido):
//   por_defecto → tildado por defecto; destildar lo manda en `excluir[]`
//   opcional sin por_defecto → destildado; tildar lo manda en `ingredientes[]` (cobra precioAdicional)
//   los demás → fijos ("incluido", no se modifican)
// El detalle del plato (GET /platos/{id}) se trae una sola vez; si la
// Carta ya lo precargó, no se vuelve a pedir.
//
// La presentación es un panel deslizante de Bootstrap (Offcanvas bottom):
// solo cambia el shell visual, la lógica de cantidades, ingredientes,
// borrador y total es la misma de siempre.

const formatearPrecio = (precio: number): string =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio)

function checksDesde(detalle: PlatoObtener, lineaInicial: LineaBorrador | null): Record<number, boolean> {
    const checks: Record<number, boolean> = {}
    for (const ing of detalle.ingredientes) {
        checks[ing.id] = lineaInicial
            ? (ing.pivot.por_defecto
                ? !lineaInicial.excluir.includes(ing.id)
                : lineaInicial.ingredientes.includes(ing.id))
            : ing.pivot.por_defecto
    }
    return checks
}

interface PersonalizarPlatoModalProps {
    show: boolean
    plato: PlatoListar | null
    // Modo edición: línea existente del borrador (reemplaza a `plato`).
    lineaInicial?: LineaBorrador | null
    // Detalle ya obtenido por el botón de agregar (evita un segundo fetch).
    detallePrecargado?: PlatoObtener | null
    onCerrar: () => void
    // Se emite tras agregar/editar la línea con éxito (feedback del botón).
    onGuardado?: () => void
}

export function PersonalizarPlatoModal({
    show,
    plato,
    lineaInicial = null,
    detallePrecargado = null,
    onCerrar,
    onGuardado,
}: PersonalizarPlatoModalProps) {
    const platoId = lineaInicial?.plato.id ?? plato?.id ?? null
    const titulo = lineaInicial?.plato.nombre ?? plato?.nombre ?? 'Personalizar plato'

    return (
        <Offcanvas
            show={show}
            onHide={onCerrar}
            placement='bottom'
            className={s.panel}
            backdropClassName={s.backdrop}
            aria-label={titulo}
        >
            {show && platoId !== null && (
                <ContenidoPanel
                    // Remonta por plato: cada apertura arranca con estados limpios.
                    key={platoId}
                    platoId={platoId}
                    titulo={titulo}
                    lineaInicial={lineaInicial}
                    detallePrecargado={detallePrecargado?.id === platoId ? detallePrecargado : null}
                    onCerrar={onCerrar}
                    onGuardado={onGuardado}
                />
            )}
        </Offcanvas>
    )
}

interface ContenidoProps {
    platoId: number
    titulo: string
    lineaInicial: LineaBorrador | null
    detallePrecargado: PlatoObtener | null
    onCerrar: () => void
    onGuardado?: () => void
}

function ContenidoPanel({ platoId, titulo, lineaInicial, detallePrecargado, onCerrar, onGuardado }: ContenidoProps) {
    const { agregarLinea, editarLinea } = useCliente()

    const [detalle, setDetalle] = useState<PlatoObtener | null>(detallePrecargado)
    const [cargando, setCargando] = useState(detallePrecargado === null)
    const [errorCarga, setErrorCarga] = useState<string | null>(null)
    // La cantidad vive como texto mientras se escribe: así al enfocar se
    // selecciona el valor por defecto (tipear lo reemplaza) y se puede
    // borrar para escribir otro número. El número real se deriva y se
    // normaliza al salir del campo.
    const [cantidadTexto, setCantidadTexto] = useState(() => String(lineaInicial?.cantidad ?? 1))
    const cantidad = Math.max(1, Number(cantidadTexto) || 1)
    const [checks, setChecks] = useState<Record<number, boolean>>(() =>
        detallePrecargado ? checksDesde(detallePrecargado, lineaInicial) : {},
    )

    useEffect(() => {
        if (detallePrecargado) return
        const controller = new AbortController()
        async function cargar() {
            try {
                const obtenido = await getPlato(platoId, controller.signal)
                setDetalle(obtenido)
                setChecks(checksDesde(obtenido, lineaInicial))
            } catch (err) {
                if (err instanceof DOMException && err.name === 'AbortError') return
                setErrorCarga(err instanceof Error ? err.message : 'No se pudieron cargar los ingredientes')
            } finally {
                setCargando(false)
            }
        }
        cargar()
        return () => controller.abort()
    }, [detallePrecargado, platoId, lineaInicial])

    function guardar(evento: FormEvent<HTMLFormElement>) {
        evento.preventDefault()
        if (!detalle) return

        const ingredientes: number[] = []
        const excluir: number[] = []
        for (const ing of detalle.ingredientes) {
            const tildado = checks[ing.id] ?? ing.pivot.por_defecto
            if (ing.pivot.por_defecto) {
                // Sólo se pueden excluir los opcionales; el obligatorio
                // (por_defecto sin opcional) queda fijo en el plato.
                if (!tildado && ing.pivot.opcional) excluir.push(ing.id)
            } else if (ing.pivot.opcional && tildado) {
                ingredientes.push(ing.id)
            }
        }

        const opciones: Record<number, OpcionBorrador> = {}
        for (const id of [...ingredientes, ...excluir]) {
            const ing = detalle.ingredientes.find(i => i.id === id)
            if (ing) {
                opciones[id] = { id: ing.id, nombre: ing.nombre, precioAdicional: Number(ing.precioAdicional) }
            }
        }

        if (lineaInicial) {
            editarLinea(lineaInicial.clave, { cantidad, ingredientes, excluir, opciones })
        } else {
            agregarLinea({
                plato: {
                    id: detalle.id,
                    nombre: detalle.nombre,
                    imagen: detalle.imagen_url,
                    precio: Number(detalle.precio),
                },
                cantidad,
                ingredientes,
                excluir,
                opciones,
            })
        }
        onGuardado?.()
        onCerrar()
    }

    // Subtotal estimado: base + adicionales tildados × cantidad (el
    // descuento de promos lo calcula el backend al enviar el pedido).
    const subtotal = detalle
        ? (detalle.precio
            + detalle.ingredientes
                .filter(ing => (checks[ing.id] ?? ing.pivot.por_defecto) && ing.pivot.opcional && !ing.pivot.por_defecto)
                .reduce((acum, ing) => acum + Number(ing.precioAdicional), 0))
        * cantidad
        : 0

    return (
        <>
            {/* Barrita decorativa del panel (no arrastra). */}
            <span className={s.grabber} aria-hidden='true' />

            <Offcanvas.Header closeButton closeLabel='Cerrar' className={s.cabecera}>
                <Offcanvas.Title className={`text-headline-sm ${s.titulo}`}>
                    {titulo}
                </Offcanvas.Title>
            </Offcanvas.Header>

            <Form onSubmit={guardar} noValidate className={s.form}>
                <Offcanvas.Body className={s.cuerpo}>
                    {cargando && (
                        <div className={s.cargando}>
                            <Spinner animation='border' size='sm' />
                            <span className='text-body-md'>Cargando ingredientes…</span>
                        </div>
                    )}

                    {errorCarga && <Alert variant='danger' className='text-body-sm'>{errorCarga}</Alert>}

                    {detalle && !cargando && (
                        <>
                            <Form.Group controlId='cantidad-linea' className={s.seccion}>
                                <Form.Label className={`text-label-md ${s.seccionTitulo}`}>Cantidad</Form.Label>
                                <div className={s.stepper}>
                                    <button
                                        type='button'
                                        className={s.stepperBoton}
                                        onClick={() => setCantidadTexto(String(Math.max(1, cantidad - 1)))}
                                        disabled={cantidad <= 1}
                                        aria-label='Restar una unidad'
                                    >
                                        <i className='bi bi-dash-lg' aria-hidden='true' />
                                    </button>
                                    <Form.Control
                                        type='number'
                                        min={1}
                                        step={1}
                                        inputMode='numeric'
                                        className={s.cantidadInput}
                                        value={cantidadTexto}
                                        onFocus={e => e.currentTarget.select()}
                                        onClick={e => e.currentTarget.select()}
                                        onChange={e => setCantidadTexto(e.target.value.replace(/\D/g, ''))}
                                        onBlur={() => setCantidadTexto(String(cantidad))}
                                    />
                                    <button
                                        type='button'
                                        className={s.stepperBoton}
                                        onClick={() => setCantidadTexto(String(cantidad + 1))}
                                        aria-label='Sumar una unidad'
                                    >
                                        <i className='bi bi-plus-lg' aria-hidden='true' />
                                    </button>
                                </div>
                            </Form.Group>

                            {detalle.ingredientes.length > 0 && (
                                <section className={s.seccion}>
                                    <h3 className={`text-label-md ${s.seccionTitulo}`}>
                                        Ingredientes y preparación
                                    </h3>
                                    <div className={s.ingredientes}>
                                        {detalle.ingredientes.map(ing => {
                                            // Obligatorio = por_defecto sin opcional: fijo, no se toca.
                                            // Inerte (!opcional y !por_defecto) no se muestra.
                                            if (!ing.pivot.opcional) {
                                                if (!ing.pivot.por_defecto) return null
                                                return (
                                                    <div key={ing.id} className={`${s.fila} ${s.filaFija}`}>
                                                        <i className='bi bi-check-circle-fill' aria-hidden='true' />
                                                        <span className={`text-body-md ${s.nombreIngrediente}`}>
                                                            {ing.nombre}
                                                        </span>
                                                        <span className={`text-label-sm ${s.chip}`}>Incluido</span>
                                                    </div>
                                                )
                                            }
                                            const tildado = checks[ing.id] ?? ing.pivot.por_defecto
                                            const esAgregar = !ing.pivot.por_defecto
                                            const adicional = Number(ing.precioAdicional)
                                            const textoChip = esAgregar
                                                ? (adicional > 0 ? `+ ${formatearPrecio(adicional)}` : 'Opcional')
                                                : (tildado ? 'Incluido' : 'Excluido')
                                            return (
                                                <Form.Check
                                                    key={ing.id}
                                                    type='checkbox'
                                                    id={`ing-linea-${ing.id}`}
                                                    className={s.fila}
                                                    checked={tildado}
                                                    label={
                                                        <>
                                                            <span className={`text-body-md ${s.nombreIngrediente}`}>
                                                                {ing.nombre}
                                                            </span>
                                                            <span
                                                                className={`text-label-sm ${s.chip} ${esAgregar && adicional > 0 ? s.chipPrecio : ''}`}
                                                            >
                                                                {textoChip}
                                                            </span>
                                                        </>
                                                    }
                                                    onChange={e => setChecks(prev => ({ ...prev, [ing.id]: e.target.checked }))}
                                                />
                                            )
                                        })}
                                    </div>
                                </section>
                            )}

                            {detalle.ingredientes.length === 0 && (
                                <p className={`text-body-sm ${s.sinIngredientes}`}>
                                    Este plato no tiene ingredientes para personalizar.
                                </p>
                            )}
                        </>
                    )}
                </Offcanvas.Body>

                <div className={s.pie}>
                    <div className={s.total}>
                        <span className={`text-label-sm ${s.totalEtiqueta}`}>Total</span>
                        <span className='text-price-display'>{formatearPrecio(subtotal)}</span>
                    </div>
                    <div className={s.acciones}>
                        <Button
                            type='button'
                            variant='outline-secondary'
                            className={`text-label-md ${s.botonCancelar}`}
                            onClick={onCerrar}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type='submit'
                            variant='primary'
                            className={`text-label-md ${s.botonAgregar}`}
                            disabled={!detalle || cargando}
                        >
                            <i className='bi bi-plus-lg me-1' aria-hidden='true' />
                            {lineaInicial ? 'Guardar cambios' : 'Agregar al pedido'}
                        </Button>
                    </div>
                </div>
            </Form>
        </>
    )
}
