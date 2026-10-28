import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap'
import { getPlato } from '../../api/platos'
import { useCliente } from '../../context/ClienteContext/useCliente'
import type { LineaBorrador, OpcionBorrador } from '../../types/Cliente'
import type { PlatoListar, PlatoObtener } from '../../types/Menu'
import s from './PersonalizarPlatoModal.module.css'

// Modal de personalización de una línea: agregar desde la Carta o
// editar desde Mi pedido. Misma semántica de ingredientes que la toma
// de pedido del mozo (TomarPedido):
//   por_defecto → tildado por defecto; destildar lo manda en `excluir[]`
//   opcional sin por_defecto → destildado; tildar lo manda en `ingredientes[]` (cobra precioAdicional)
//   los demás → fijos ("incluido", no se modifican)
// El detalle del plato (GET /platos/{id}) se trae una sola vez; si la
// Carta ya lo precargó, no se vuelve a pedir.

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
        <Modal show={show} onHide={onCerrar} centered aria-label={titulo}>
            {show && platoId !== null && (
                <ContenidoModal
                    // Remonta por plato: cada apertura arranca con estados limpios.
                    key={platoId}
                    platoId={platoId}
                    lineaInicial={lineaInicial}
                    detallePrecargado={detallePrecargado?.id === platoId ? detallePrecargado : null}
                    onCerrar={onCerrar}
                    onGuardado={onGuardado}
                />
            )}
        </Modal>
    )
}

interface ContenidoProps {
    platoId: number
    lineaInicial: LineaBorrador | null
    detallePrecargado: PlatoObtener | null
    onCerrar: () => void
    onGuardado?: () => void
}

function ContenidoModal({ platoId, lineaInicial, detallePrecargado, onCerrar, onGuardado }: ContenidoProps) {
    const { agregarLinea, editarLinea } = useCliente()

    const [detalle, setDetalle] = useState<PlatoObtener | null>(detallePrecargado)
    const [cargando, setCargando] = useState(detallePrecargado === null)
    const [errorCarga, setErrorCarga] = useState<string | null>(null)
    const [cantidad, setCantidad] = useState(() => lineaInicial?.cantidad ?? 1)
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
                if (!tildado) excluir.push(ing.id)
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
                    imagen: detalle.imagen,
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
            <Modal.Header closeButton>
                <Modal.Title className='text-headline-sm'>
                    {lineaInicial ? 'Editar plato' : 'Personalizar plato'}
                </Modal.Title>
            </Modal.Header>

            <Form onSubmit={guardar} noValidate>
                <Modal.Body>
                <p className={`text-headline-sm ${s.nombrePlato}`}>{detalle?.nombre ?? 'Plato'}</p>

                {cargando && (
                    <div className={s.cargando}>
                        <Spinner animation='border' size='sm' />
                        <span className='text-body-md'>Cargando ingredientes…</span>
                    </div>
                )}

                {errorCarga && <Alert variant='danger' className='text-body-sm'>{errorCarga}</Alert>}

                {detalle && !cargando && (
                    <>
                        <Form.Group controlId='cantidad-linea' className={s.cantidadGrupo}>
                            <Form.Label className='text-label-md'>Cantidad</Form.Label>
                            <Form.Control
                                type='number'
                                min={1}
                                className={s.cantidadInput}
                                value={cantidad}
                                onChange={e => setCantidad(Math.max(1, Number(e.target.value) || 1))}
                            />
                        </Form.Group>

                        {detalle.ingredientes.length > 0 && (
                            <div className={s.ingredientes}>
                                <span className={`text-label-md ${s.ingredientesTitulo}`}>Ingredientes</span>
                                {detalle.ingredientes.map(ing => {
                                    const modificable = ing.pivot.por_defecto || ing.pivot.opcional
                                    if (!modificable) {
                                        return (
                                            <span key={ing.id} className={`text-body-sm ${s.ingredienteFijo}`}>
                                                <i className='bi bi-check2' aria-hidden='true' />
                                                {ing.nombre} (incluido)
                                            </span>
                                        )
                                    }
                                    const tildado = checks[ing.id] ?? ing.pivot.por_defecto
                                    const esAgregar = ing.pivot.opcional && !ing.pivot.por_defecto
                                    return (
                                        <Form.Check
                                            key={ing.id}
                                            type='checkbox'
                                            id={`ing-linea-${ing.id}`}
                                            className={`text-body-sm ${s.ingredienteCheck}`}
                                            checked={tildado}
                                            label={
                                                <>
                                                    {ing.nombre}
                                                    {esAgregar && Number(ing.precioAdicional) > 0 && (
                                                        <span className={s.adicional}>
                                                            + {formatearPrecio(Number(ing.precioAdicional))}
                                                        </span>
                                                    )}
                                                </>
                                            }
                                            onChange={e => setChecks(prev => ({ ...prev, [ing.id]: e.target.checked }))}
                                        />
                                    )
                                })}
                            </div>
                        )}

                        {detalle.ingredientes.length === 0 && (
                            <p className={`text-body-sm ${s.sinIngredientes}`}>
                                Este plato no tiene ingredientes para personalizar.
                            </p>
                        )}
                    </>
                )}
            </Modal.Body>

            <Modal.Footer>
                <span className='text-price-display'>{formatearPrecio(subtotal)}</span>
                <Button type='button' variant='outline-secondary' className='text-label-md' onClick={onCerrar}>
                    Cancelar
                </Button>
                <Button
                    type='submit'
                    variant='primary'
                    className='text-label-md'
                    disabled={!detalle || cargando}
                >
                    <i className='bi bi-plus-lg me-1' aria-hidden='true' />
                    {lineaInicial ? 'Guardar cambios' : 'Agregar al pedido'}
                </Button>
            </Modal.Footer>
            </Form>
        </>
    )
}
