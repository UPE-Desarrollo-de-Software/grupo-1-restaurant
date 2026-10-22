import { useState } from 'react'
import type { FormEvent } from 'react'
import { Alert, Button, Form, Spinner } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { acceder } from '../../api/cliente'
import { useCliente } from '../../context/ClienteContext/useCliente'
import { codigoMesaSchema } from '../../schemas/cliente'
import s from './MesaPage.module.css'

// Identificación de la mesa con el código de 4 dígitos que reparte el
// mozo (POST /acceso). Es de un solo uso: al validar, la página queda
// directamente en la tarjeta "Mesa identificada" (no se puede cambiar
// el código desde acá).
export function MesaPage() {
    const { mesa, aplicarIdentificacion } = useCliente()

    const [codigo, setCodigo] = useState('')
    const [errorCampo, setErrorCampo] = useState<string | null>(null)
    const [errorApi, setErrorApi] = useState<string | null>(null)
    const [validando, setValidando] = useState(false)

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
                            Estado: {mesa.estado}. Ya podés armar tu pedido.
                        </p>
                    </div>
                    <div className={s.accionesIdentificada}>
                        <Link to='/carta' className='btn btn-primary text-label-md'>Ir a la Carta</Link>
                        <Link to='/pedido' className='btn btn-outline-primary text-label-md'>Mi pedido</Link>
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
                    Con el código de tu mesa activás el auto-pedido: vas a poder
                    agregar platos desde la Carta, armar tu pedido y enviarlo
                    cuando estés listo.
                </p>
            </header>

            <section className={s.tarjeta}>
                <h2 className={`text-headline-sm ${s.tituloFormulario}`}>
                    Ingresá el código de la mesa
                </h2>

                <Form onSubmit={confirmarCodigo} noValidate>
                    <Form.Group controlId='codigo-mesa'>
                        <Form.Label className='text-label-md'>Código de 4 dígitos</Form.Label>
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

                    {errorApi && <Alert variant='danger' className={`text-body-sm ${s.alerta}`}>{errorApi}</Alert>}

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

                <div id='codigo-ayuda' className={s.ayuda}>
                    <p className={`text-body-sm ${s.ayudaTitulo}`}>
                        <i className='bi bi-info-circle me-1' aria-hidden='true' />
                        ¿Cómo funciona?
                    </p>
                    <p className='text-body-sm'>
                        <strong>El código te lo proporciona tu mozo</strong> al sentarte
                        (son 4 dígitos). El sistema lo valida, identifica tu mesa y a
                        partir de ahí quedás habilitado para armar tu pedido desde la
                        Carta. Sin el código podés seguir viendo la carta, pero no
                        agregar platos.
                    </p>
                </div>
            </section>
        </div>
    )
}
