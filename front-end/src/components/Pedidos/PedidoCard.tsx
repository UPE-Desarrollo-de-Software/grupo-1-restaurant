import { useState } from 'react'
import { Alert, Button, Spinner, Modal } from 'react-bootstrap'
import type { EstadoPedido, PedidoResumen } from '../../types/Mesa'
import { cambiarEstadoPedido, confirmarPedido } from '../../api/pedidos'
import s from './PedidoCard.module.css'

// Tarjeta de un pedido activo de la mesa con las acciones del mozo.
// Matriz de transiciones espejo de PedidoService::cambiarEstado():
//   en_curso → (confirmar) → confirmado → (enviar) → enviado;
//   la COCINA avanza enviado → en_preparacion → listo (PUT
//   /cocina/pedidos/{id}/estado); el mozo cierra listo → entregado →
//   cerrado y cancela desde cualquier no final (en enviado y
//   en_preparacion sólo cancel); confirmado → en_curso deshace.

const ETIQUETAS_ESTADO: Record<EstadoPedido, string> = {
    en_curso: 'En curso',
    confirmado: 'Confirmado',
    enviado: 'Enviado',
    en_preparacion: 'En preparación',
    listo: 'Listo',
    entregado: 'Entregado',
    cerrado: 'Entregado',
    cancelado: 'Cancelado',
}

const CLASES_ESTADO: Record<EstadoPedido, string> = {
    en_curso: 'badgeEnCurso',
    confirmado: 'badgeConfirmado',
    enviado: 'badgeEnviado',
    en_preparacion: 'badgePreparacion',
    listo: 'badgeListo',
    entregado: 'badgeEntregado',
    cerrado: 'badgeEntregado',
    cancelado: 'badgeCancelado',
}

// Estado al que lleva cada acción (matriz de PedidoService::cambiarEstado).
// Mientras la acción corre, el badge y los botones se renderizan desde el
// destino: feedback inmediato en prod (la req puede tardar). Si falla,
// `accion` se limpia al instante y vuelve a renderizarse el estado real.
const DESTINO: Record<Accion, EstadoPedido> = {
    confirmar: 'confirmado',
    forzar: 'confirmado',
    enviar: 'enviado',
    reabrir: 'en_curso',
    cancelar: 'cancelado',
    entregado: 'cerrado',
    cerrar: 'cerrado',
}

const formatearPrecio = (precio: number): string =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(precio)

// No se exporta: react-refresh/only-export-components.
function AuxiliarLinea({ descuento, promocion }: { descuento: number; promocion: { nombre: string } | null }) {
    if (!promocion && descuento <= 0) return null
    return (
        <span className={`text-body-sm ${s.lineaAux}`}>
            {promocion && <span className={s.promoTag}>{promocion.nombre}</span>}
            {descuento > 0 && <span className={s.descuento}>− {formatearPrecio(descuento)}</span>}
        </span>
    )
}

// No se exporta: react-refresh/only-export-components.
function BotonAccion({
    etiqueta, icono, variant, proceso, bloqueado, onClick,
}: {
    etiqueta: string
    icono: string
    variant: string
    // Es la acción que está corriendo: muestra el spinner.
    proceso: boolean
    // Hay una acción en curso (cualquiera): deshabilita todos los botones
    // para no disparar transiciones encadenadas.
    bloqueado: boolean
    onClick: () => void
}) {
    return (
        <Button
            size='sm'
            variant={variant}
            className='text-label-md'
            type='button'
            disabled={bloqueado}
            onClick={onClick}
        >
            {proceso
                ? <><Spinner size='sm' animation='border' className='me-1' />{etiqueta}...</>
                : <><i className={`bi ${icono} me-1`} aria-hidden='true' />{etiqueta}</>}
        </Button>
    )
}

type Accion = 'confirmar' | 'forzar' | 'enviar' | 'reabrir' | 'cancelar'
    | 'entregado' | 'cerrar'

interface PedidoCardProps {
    pedido: PedidoResumen
    // Refetch del resumen de la mesa tras cualquier acción exitosa;
    // puede esperarse con await para que el spinner cubra el refetch.
    onCambio: () => void | Promise<void>
    // "Agregar líneas" (habilitado solo para pedidos en curso).
    onAgregar?: () => void
}

export function PedidoCard({ pedido, onCambio, onAgregar }: PedidoCardProps) {
    const [accion, setAccion] = useState<Accion | null>(null)
    const [errorApi, setErrorApi] = useState<string | null>(null)
    const [exito, setExito] = useState<string | null>(null)
    const [confirmandoCancelar, setConfirmandoCancelar] = useState(false)
    // El gate de confirmar (422 "Faltan comensales…") ofrece forzar.
    const [permiteForzar, setPermiteForzar] = useState(false)

    const estado = (ETIQUETAS_ESTADO[pedido.estado as EstadoPedido] ? pedido.estado : 'en_curso') as EstadoPedido
    // UI optimista: mientras la acción corre se muestra el estado destino
    // (badge y acciones) sin esperar al refetch. Al terminar, `accion` se
    // limpia recién con el resumen ya refrescado (sin flash de vuelta).
    const estadoRender = accion !== null ? DESTINO[accion] : estado

    async function correr(tipo: Accion, tarea: () => Promise<{ mensaje: string }>) {
        setAccion(tipo)
        setErrorApi(null)
        setExito(null)
        try {
            const { mensaje } = await tarea()
            setExito(mensaje)
            setPermiteForzar(false)
            await onCambio()
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'No se pudo completar la operación'
            setErrorApi(msg)
            setPermiteForzar(msg.includes('forzar'))
        } finally {
            setAccion(null)
        }
    }
    function confirmarCancelacion() {
        setConfirmandoCancelar(false) // cierra el modal; el spinner pasa a la tarjeta
        correr('cancelar', () => cambiarEstadoPedido(pedido.id, 'cancelado'))
    }

    const ocupado = accion !== null
    
    const botonCancelar = (
    <BotonAccion
        etiqueta='Cancelar' icono='bi-x-circle' variant='outline-danger'
        proceso={accion === 'cancelar'} bloqueado={ocupado}
        onClick={() => setConfirmandoCancelar(true)}
    />
)
    return (
        <article className={s.card}>
            <div className={s.header}>
                <span className={`text-headline-sm ${s.titulo}`}>Pedido #{pedido.id}</span>
                <span className={`text-label-sm ${s[CLASES_ESTADO[estadoRender]]}`}>
                    {ETIQUETAS_ESTADO[estadoRender]}
                </span>
                {(estadoRender === 'en_curso' || estadoRender === 'confirmado') && (
                    <span className={`text-label-sm ${pedido.todas_confirmadas ? s.badgeOk : s.badgePendiente}`}>
                        {pedido.todas_confirmadas ? 'Todas confirmadas' : 'Faltan confirmar'}
                    </span>
                )}
            </div>

            <ul className={s.lineas}>
                {pedido.lineas.map(linea => (
                    <li key={linea.detalle_id} className={s.linea}>
                        <span className={`text-body-md ${s.lineaPlato}`}>
                            {linea.cantidad}× {linea.plato}
                        </span>
                        <AuxiliarLinea descuento={linea.descuento} promocion={linea.promocion} />
                        <span className={`text-body-md ${s.lineaMonto}`}>
                            {formatearPrecio(linea.subtotal)}
                        </span>
                        <span
                            className={linea.confirmado ? s.confirmadoSi : s.confirmadoNo}
                            title={linea.confirmado ? 'Línea confirmada' : 'Línea sin confirmar'}
                        >
                            <i
                                className={`bi ${linea.confirmado ? 'bi-check2-circle' : 'bi-dash-circle'}`}
                                aria-hidden='true'
                            />
                        </span>
                    </li>
                ))}
            </ul>

            <div className={s.total}>
                <span className='text-label-md'>Total del pedido</span>
                <span className='text-price-display'>{formatearPrecio(pedido.total)}</span>
            </div>

            {errorApi && <Alert variant='danger' className={`text-body-sm ${s.mensaje}`}>{errorApi}</Alert>}
            {exito && <Alert variant='success' className={`text-body-sm ${s.mensaje}`}>{exito}</Alert>}

            {permiteForzar && (
                <Button
                    size='sm'
                    variant='warning'
                    className={`text-label-md ${s.botonForzar}`}
                    type='button'
                    disabled={ocupado}
                    onClick={() => correr('forzar', () => confirmarPedido(pedido.id, true))}
                >
                    <i className='bi bi-exclamation-triangle me-1' aria-hidden='true' />
                    Forzar confirmación y enviar igual
                </Button>
            )}

            <div className={s.acciones}>
                {estadoRender === 'en_curso' && (
                    <>
                        <BotonAccion
                            etiqueta='Confirmar' icono='bi-check2-circle' variant='primary'
                            proceso={accion === 'confirmar'} bloqueado={ocupado}
                            onClick={() => correr('confirmar', () => confirmarPedido(pedido.id))}
                        />
                        {onAgregar && (
                            <BotonAccion
                                etiqueta='Agregar líneas' icono='bi-plus-lg' variant='outline-primary'
                                proceso={false} bloqueado={false}
                                onClick={onAgregar}
                            />
                        )}
                        <BotonAccion
                            etiqueta='Cancelar' icono='bi-x-circle' variant='outline-danger'
                            proceso={accion === 'cancelar'} bloqueado={ocupado}
                            onClick={() => correr('cancelar', () => cambiarEstadoPedido(pedido.id, 'cancelado'))}
                        />
                    </>
                )}

                {estadoRender === 'enviado' && (
                    <>
                        <span className={`text-body-sm ${s.enCocina}`}>
                            <i className='bi bi-fire me-1' aria-hidden='true' />
                            Tu pedido esta en espera
                        </span>
                        {botonCancelar}
                    </>
                )}

                {estadoRender === 'en_preparacion' && (
                    <>
                        <span className={`text-body-sm ${s.enCocina}`}>
                            <i className='bi bi-fire me-1' aria-hidden='true' />
                            Tu pedido se esta cocinando
                        </span>
                        {botonCancelar}
                    </>
                )}

                {estadoRender === 'listo' && (
                    <>
                        <BotonAccion
                            etiqueta='Marcar entregado' icono='bi-bag-check' variant='outline-primary'
                            proceso={accion === 'entregado'} bloqueado={ocupado}
                            onClick={() => correr('entregado', async () => {
                                await cambiarEstadoPedido(pedido.id, 'entregado')
                                // await cambiarEstadoPedido(pedido.id, 'cerrado')
   
                                return { mensaje: 'Pedido entregado' }
                            })}
                        />
                        {botonCancelar}
                    </>
                )}
            </div>

            <Modal
                show={confirmandoCancelar}
                onHide={() => setConfirmandoCancelar(false)}
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title className='text-headline-sm'>
                        Cancelar pedido #{pedido.id}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className='text-body-md'>
                    ¿Seguro que querés cancelar este pedido? Esta acción no se puede deshacer.
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant='outline-secondary'
                        className='text-label-md'
                        onClick={() => setConfirmandoCancelar(false)}
                    >
                        Volver
                    </Button>
                    <Button
                        variant='primary'
                        className='text-label-md'
                        onClick={confirmarCancelacion}
                        type='button'
                    >
                        <i className='bi bi-x-circle me-1' aria-hidden='true' />
                        Sí, cancelar pedido
                    </Button>
                </Modal.Footer>
            </Modal>
        </article>
    )
}
