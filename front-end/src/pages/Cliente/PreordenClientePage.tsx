import { useState } from 'react'
import { Alert, Button, Form, Spinner } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { eliminarPreordenCliente, getPreordenCliente, guardarPreordenCliente } from '../../api/cliente'
import { PreordenCliente } from '../../components/Cliente/PreordenCliente'
import type { LineaPreorden } from '../../types/Reserva'
import s from './PreordenClientePage.module.css'

// Pre-orden por PIN de la reserva (PÚBLICO con throttle): el cliente
// consulta y rearmas su carrito mientras la reserva siga pendiente.
// Ojo con el contrato: el PUT solo MERGEA (no borra líneas ausentes) y
// el DELETE vacía todo, así que el reemplazo completo es DELETE + PUT.
export function PreordenClientePage() {
    const [pin, setPin] = useState('')
    const [errorCampo, setErrorCampo] = useState<string | null>(null)

    const [cargando, setCargando] = useState(false)
    const [errorApi, setErrorApi] = useState<string | null>(null)
    const [exito, setExito] = useState<string | null>(null)

    // Líneas cargadas del servidor; null = todavía no se consultó.
    const [pinCargado, setPinCargado] = useState<string | null>(null)
    const [lineas, setLineas] = useState<LineaPreorden[] | null>(null)
    const [guardando, setGuardando] = useState(false)

    async function consultar(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setErrorApi(null)
        setExito(null)

        if (!/^\d{4}$/.test(pin)) {
            setErrorCampo('El PIN debe tener exactamente 4 dígitos')
            return
        }
        setErrorCampo(null)

        setCargando(true)
        try {
            const guardadas = await getPreordenCliente(pin)
            setLineas(guardadas)
            setPinCargado(pin)
        } catch (err) {
            setErrorApi(err instanceof Error ? err.message : 'No se pudo consultar la pre-orden')
        } finally {
            setCargando(false)
        }
    }

    async function guardar() {
        if (lineas === null || pinCargado === null) return

        setGuardando(true)
        setErrorApi(null)
        setExito(null)
        try {
            if (lineas.length === 0) {
                // Vaciar = DELETE (el PUT con lista vacía es no-op).
                await eliminarPreordenCliente(pinCargado)
            } else {
                // Reemplazo completo: se vacía y después se guardan las
                // líneas nuevas. Si el PUT falla, el catch recarga el
                // estado REAL del servidor (el borrado ya se hizo).
                await eliminarPreordenCliente(pinCargado)
                const guardadas = await guardarPreordenCliente(pinCargado, lineas)
                setLineas(guardadas)
            }
            setExito('Pre-orden guardada. Cuando llegues a la mesa se envía sola a cocina.')
        } catch (err) {
            setErrorApi(err instanceof Error ? err.message : 'No se pudo guardar la pre-orden')
            // Resincronizar: el DELETE pudo haberse ejecutado antes del fallo.
            try {
                setLineas(await getPreordenCliente(pinCargado))
            } catch {
                // Sin red se conserva lo que se ve en pantalla.
            }
        } finally {
            setGuardando(false)
        }
    }

    function editarLineas(nuevas: LineaPreorden[]) {
        setLineas(nuevas)
        setExito(null)
    }

    function otraReserva() {
        setLineas(null)
        setPinCargado(null)
        setPin('')
        setErrorCampo(null)
        setErrorApi(null)
        setExito(null)
    }

    return (
        <div className={s.pagina}>
            <header className={s.encabezado}>
                <span className={s.icono} aria-hidden='true'>
                    <i className='bi bi-basket' />
                </span>
                <h1 className='text-headline-lg'>Tu pre-orden</h1>
                <p className={`text-body-md ${s.intro}`}>
                    Armá tu pedido antes de venir: llegando a la mesa se envía solo a cocina.
                    Con el PIN de tu reserva la ves o la modificás cuando quieras.
                </p>
            </header>

            {lineas === null ? (
                <section className={s.tarjeta}>
                    <h2 className={`text-headline-sm ${s.tituloFormulario}`}>
                        Ingresá el PIN de tu reserva
                    </h2>

                    <Form onSubmit={consultar} noValidate>
                        <Form.Group controlId='preorden-pin'>
                            <Form.Control
                                type='text'
                                inputMode='numeric'
                                autoComplete='off'
                                maxLength={4}
                                placeholder='1234'
                                className={`text-headline-md ${s.pinInput}`}
                                value={pin}
                                isInvalid={errorCampo !== null}
                                aria-describedby='preorden-pin-ayuda'
                                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            />
                            <Form.Control.Feedback type='invalid' className='text-body-sm'>
                                {errorCampo}
                            </Form.Control.Feedback>
                        </Form.Group>

                        {errorApi && (
                            <Alert variant='danger' className={`text-body-sm ${s.alerta}`}>{errorApi}</Alert>
                        )}

                        <Button
                            type='submit'
                            variant='primary'
                            className={`w-100 text-label-md ${s.boton}`}
                            disabled={cargando}
                        >
                            {cargando
                                ? (
                                    <>
                                        <Spinner size='sm' animation='border' className='me-2' />
                                        Consultando…
                                    </>
                                )
                                : (
                                    <>
                                        <i className='bi bi-search me-2' aria-hidden='true' />
                                        Ver mi pre-orden
                                    </>
                                )}
                        </Button>
                    </Form>

                    <div className={s.ayuda} id='preorden-pin-ayuda'>
                        <p className={`text-body-sm ${s.ayudaTitulo}`}>¿Dónde está mi PIN?</p>
                        <p className='text-body-sm'>
                            Es el código de 4 dígitos que te dimos al confirmar la reserva. No es
                            el número de tu pedido.
                        </p>
                        <p className='text-body-sm mb-0'>
                            ¿Todavía no reservaste? <Link to='/reservas'>Pedí tu mesa</Link>.
                        </p>
                    </div>
                </section>
            ) : (
                <section className={s.tarjeta}>
                    <div className={s.pinBox}>
                        <div>
                            <p className={`text-label-sm ${s.pinEtiqueta}`}>PIN de tu reserva</p>
                            <p className={`text-headline-md ${s.pinValor}`}>{pinCargado}</p>
                        </div>
                        <Button
                            type='button'
                            size='sm'
                            variant='outline-secondary'
                            className='text-label-md'
                            onClick={otraReserva}
                            disabled={guardando}
                        >
                            <i className='bi bi-arrow-left me-1' aria-hidden='true' />
                            Otra reserva
                        </Button>
                    </div>

                    {errorApi && (
                        <Alert variant='danger' className={`text-body-sm ${s.alerta}`}>{errorApi}</Alert>
                    )}
                    {exito && (
                        <Alert variant='success' className={`text-body-sm ${s.alerta}`}>{exito}</Alert>
                    )}

                    <PreordenCliente
                        lineas={lineas}
                        onChange={editarLineas}
                        disabled={guardando}
                    />

                    <Button
                        type='button'
                        variant='primary'
                        className={`w-100 text-label-lg ${s.boton}`}
                        onClick={guardar}
                        disabled={guardando}
                    >
                        {guardando
                            ? (
                                <>
                                    <Spinner size='sm' animation='border' className='me-2' />
                                    Guardando…
                                </>
                            )
                            : (
                                <>
                                    <i className='bi bi-check2 me-2' aria-hidden='true' />
                                    Guardar cambios
                                </>
                            )}
                    </Button>

                    <p className={`text-body-sm ${s.nota}`}>
                        Los cambios no se guardan hasta que toques "Guardar cambios". La pre-orden
                        solo se edita mientras tu reserva siga pendiente.
                    </p>
                </section>
            )}
        </div>
    )
}
