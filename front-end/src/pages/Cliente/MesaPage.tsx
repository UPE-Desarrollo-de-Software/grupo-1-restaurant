import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap'
import { Link, useSearchParams } from 'react-router-dom'
import { acceder } from '../../api/cliente'
import { useCliente } from '../../context/ClienteContext/useCliente'
import { codigoMesaSchema } from '../../schemas/cliente'
import type { ClienteMesa } from '../../types/Cliente'
import s from './MesaPage.module.css'

// Resultado del último intento de acceso por QR, claveado por el código
// de la URL para derivar el estado de carga en cada render.
type ResultadoQr =
    | { codigo: string; tipo: 'entrada'; encontrada: ClienteMesa }
    | { codigo: string; tipo: 'cambio'; encontrada: ClienteMesa }
    | { codigo: string; tipo: 'error'; error: string }

// Identificación de la mesa: con el QR de la visita (URL
// /mesa?codigo=XXXX) valida sola vía POST /acceso; si no, con el código
// de 4 dígitos que reparte el mozo. Es de un solo uso por visita: al
// validar, la página queda en la tarjeta "Mesa identificada".
export function MesaPage() {
    const { mesa, borrador, aplicarIdentificacion } = useCliente()

    const [codigo, setCodigo] = useState('')
    const [errorCampo, setErrorCampo] = useState<string | null>(null)
    const [errorApi, setErrorApi] = useState<string | null>(null)
    const [validando, setValidando] = useState(false)

    // QR en la URL (?codigo=XXXX): se procesa una sola vez (al terminar
    // se limpia el parámetro con replace, así un refresh no reintenta).
    const [parametros, setParametros] = useSearchParams()
    const codigoQr = parametros.get('codigo') ?? ''
    const codigoQrValido = /^\d{4}$/.test(codigoQr) ? codigoQr : null
    const [rtaQr, setRtaQr] = useState<ResultadoQr | null>(null)
    const entrandoQr = codigoQrValido !== null && (rtaQr === null || rtaQr.codigo !== codigoQrValido)

    // La sesión vigente al entrar al efecto (para detectar cambio de
    // mesa) se lee de un ref: el resultado del fetch no debe redepender
    // de un re-render posterior.
    const mesaRef = useRef(mesa)
    useEffect(() => {
        mesaRef.current = mesa
    }, [mesa])

    useEffect(() => {
        if (!codigoQrValido) return
        const controller = new AbortController()
        acceder(codigoQrValido, controller.signal)
            .then(encontrada => {
                const actual = mesaRef.current
                if (actual && actual.id !== encontrada.id) {
                    // Escaneó la mesa de otra visita: pide confirmación.
                    setRtaQr({ codigo: codigoQrValido, tipo: 'cambio', encontrada })
                } else {
                    aplicarIdentificacion(encontrada)
                    setRtaQr({ codigo: codigoQrValido, tipo: 'entrada', encontrada })
                }
                setParametros({}, { replace: true })
            })
            .catch(err => {
                if (controller.signal.aborted) return
                const mensaje = err instanceof Error
                    ? err.message
                    : 'No se pudo validar el código de la mesa'
                setRtaQr({ codigo: codigoQrValido, tipo: 'error', error: mensaje })
                // Se limpia el parámetro: el fallback es el formulario
                // manual (y un refresh no debe reintentar contra el throttle).
                setParametros({}, { replace: true })
            })
        return () => controller.abort()
    }, [codigoQrValido, aplicarIdentificacion, setParametros])

    // Un solo lugar para el error del QR: se muestra con el del form.
    const errorVisible = errorApi ?? (rtaQr?.tipo === 'error' ? rtaQr.error : null)

    function confirmarCambio() {
        if (rtaQr?.tipo === 'cambio') {
            aplicarIdentificacion(rtaQr.encontrada)
        }
        setRtaQr(null)
    }

    async function confirmarCodigo(evento: FormEvent<HTMLFormElement>) {
        evento.preventDefault()
        setErrorCampo(null)
        setErrorApi(null)

        const validado = codigoMesaSchema.safeParse({ codigo })
        if (!validado.success) {
            setErrorCampo(validado.error.issues[0]?.message ?? 'Código inválido')
            return
        }

        setValidando(true)
        try {
            const nuevaMesa = await acceder(validado.data.codigo)
            aplicarIdentificacion(nuevaMesa)
            setCodigo('')
        } catch (err) {
            setErrorApi(err instanceof Error ? err.message : 'No se pudo validar el código de la mesa')
        } finally {
            setValidando(false)
        }
    }

    if (mesa) {
        return (
            <div className={s.pagina}>
                <header className={s.encabezado}>
                    <span className={s.icono} aria-hidden='true'>
                        <i className='bi bi-qr-code-scan' />
                    </span>
                    <h1 className='text-headline-lg'>Identificá tu mesa</h1>
                </header>

                <section className={s.tarjetaIdentificada} aria-live='polite'>
                    <i className='bi bi-check-circle-fill' aria-hidden='true' />
                    <div>
                        <p className='text-headline-sm'>Mesa #{mesa.id} identificada</p>
                        <p className={`text-body-sm ${s.textoIdentificada}`}>
                            Ya podés armar tu pedido.
                        </p>
                    </div>
                    <div className={s.accionesIdentificada}>
                        <Link to='/carta' className='btn btn-primary text-label-md'>Ir a la Carta</Link>
                        <Link to='/pedido' className='btn btn-outline-primary text-label-md'>Mi pedido</Link>
                    </div>
                </section>

                <Modal
                    show={rtaQr?.tipo === 'cambio'}
                    onHide={() => setRtaQr(null)}
                    centered
                    aria-labelledby='cambiar-mesa-titulo'
                >
                    <Modal.Header closeButton>
                        <Modal.Title id='cambiar-mesa-titulo' className='text-headline-sm'>
                            Cambiar de mesa
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <p className='text-body-md mb-2'>
                            Ya estabas identificado en la mesa #{mesa.id}. Escaneaste el QR de
                            la mesa #{rtaQr?.tipo === 'cambio' ? rtaQr.encontrada.id : ''}.
                        </p>
                        <p className='text-body-sm mb-0'>
                            {borrador.length > 0
                                ? 'Si cambiás, se descarta el pedido sin enviar de esta mesa.'
                                : 'Si cambiás, pasás a pedir en la mesa nueva.'}
                        </p>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant='outline-secondary' className='text-label-md' type='button' onClick={() => setRtaQr(null)}>
                            Quedarme en la mesa #{mesa.id}
                        </Button>
                        <Button variant='primary' className='text-label-md' type='button' onClick={confirmarCambio}>
                            Cambiar a la mesa nueva
                        </Button>
                    </Modal.Footer>
                </Modal>
            </div>
        )
    }

    if (entrandoQr) {
        return (
            <div className={s.pagina}>
                <section className={s.tarjeta} aria-live='polite'>
                    <div className='d-flex flex-column align-items-center gap-3 py-3'>
                        <Spinner animation='border' />
                        <p className='text-body-md mb-0'>Entrando a tu mesa…</p>
                    </div>
                </section>
            </div>
        )
    }

    return (
        <div className={s.pagina}>
            <header className={s.encabezado}>
                <span className={s.icono} aria-hidden='true'>
                    <i className='bi bi-qr-code-scan' />
                </span>
                <h1 className='text-headline-lg'>Identificá tu mesa</h1>
                <p className={`text-body-md ${s.intro}`}>
                    Para comenzar tu pedido, pedile a tu mozo el código o el QR para entrar directo
                </p>
            </header>

            <section className={s.tarjeta}>
                <h2 className={`text-headline-sm ${s.tituloFormulario}`}>
                    Ingresá el código de la mesa
                </h2>

                <Form onSubmit={confirmarCodigo} noValidate>
                    <Form.Group controlId='codigo-mesa'>
                        <Form.Control
                            type='text'
                            inputMode='numeric'
                            autoComplete='off'
                            maxLength={4}
                            placeholder='1234'
                            className={`text-headline-md ${s.codigoInput}`}
                            value={codigo}
                            isInvalid={errorCampo !== null}
                            aria-describedby='codigo-ayuda'
                            onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        />
                        <Form.Control.Feedback type='invalid' className='text-body-sm'>
                            {errorCampo}
                        </Form.Control.Feedback>
                    </Form.Group>

                    {errorVisible && <Alert variant='danger' className={`text-body-sm ${s.alerta}`}>{errorVisible}</Alert>}

                    <Button
                        type='submit'
                        variant='primary'
                        className={`w-100 text-label-md ${s.botonConfirmar}`}
                        disabled={validando}
                    >
                        {validando
                            ? <><Spinner size='sm' animation='border' className='me-2' />Validando…</>
                            : <><i className='bi bi-box-arrow-in-right me-2' aria-hidden='true' />Confirmar código</>}
                    </Button>
                </Form>
            </section>
        </div>
    )
}
