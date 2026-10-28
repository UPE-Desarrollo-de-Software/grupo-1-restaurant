import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap'
import s from './Mesas.module.css'
import { mesaSchema } from '../../../schemas/mesas'
import { createMesa } from '../../../api/mesas'
import { getConfiguracion } from '../../../api/configuracion'
import { getUsuarios } from '../../../api/usuarios'
import { getUsuario } from '../../../api/auth'
import { QrMesaModal } from '../../../components/Mesas/QrMesaModal'
import type { Usuario } from '../../../types/Auth'
import type { MesaConCodigo } from '../../../types/Mesa'

interface CrearMesaProps {
    // Dónde vuelven Volver/Cancelar (default: panel del gerente).
    baseVuelta?: string
    // Modo mozo: GET /usuarios es 403 para su rol, así que no se lista
    // al personal y la mesa queda preasignada a la sesión vigente.
    soloSesion?: boolean
}

export function CrearMesaPage({ baseVuelta = '/gerente/mesas/gestion', soloSesion = false }: CrearMesaProps) {
    const navigate = useNavigate()
    const [capacidad, setCapacidad] = useState('')
    const [usuarioId, setUsuarioId] = useState(() =>
        soloSesion ? String(getUsuario()?.id ?? '') : ''
    )

    const [usuarios, setUsuarios] = useState<Usuario[]>([])
    // En modo mozo no hay fetch de usuarios: arranca sin carga.
    const [cargandoUsuarios, setCargandoUsuarios] = useState(!soloSesion)
    const [errorUsuarios, setErrorUsuarios] = useState<string | null>(null)

    // Aforo del CONFIG_MESA como referencia (tolerante a fallo: si no
    // carga, el alta no se rompe).
    const [aforoInfo, setAforoInfo] = useState<string | null>(null)

    const [enviando, setEnviando] = useState(false)
    const [errorApi, setErrorApi] = useState<string | null>(null)
    const [exito, setExito] = useState<string | null>(null)
    // Mesa creada: al éxito se abre el modal con el QR de la visita.
    const [mesaCreada, setMesaCreada] = useState<MesaConCodigo | null>(null)
    const [tocado, setTocado] = useState(false)

    useEffect(() => {
        if (soloSesion) return
        const controller = new AbortController()
        getUsuarios(controller.signal)
            .then(setUsuarios)
            .catch(err => {
                if (!controller.signal.aborted) {
                    setErrorUsuarios(err instanceof Error ? err.message : 'Error desconocido al cargar los usuarios')
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setCargandoUsuarios(false)
            })
        return () => controller.abort()
    }, [soloSesion])

    useEffect(() => {
        const controller = new AbortController()
        getConfiguracion(controller.signal)
            .then(config => {
                setAforoInfo(`Salón: aforo ${config.aforo} personas · hasta ${config.mesas_maximas} mesas`)
            })
            .catch(() => {
                // Sin aforo de referencia no se bloquea el alta.
            })
        return () => controller.abort()
    }, [])

    const errores: Record<string, string> = {}
    const resultados = mesaSchema.safeParse({ capacidad, estado: 'ocupada', usuario_id: usuarioId })
    if (!resultados.success) {
        for (const issue of resultados.error.issues) {
            const campo = issue.path[0]
            if (typeof campo === 'string' && !errores[campo]) {
                errores[campo] = issue.message
            }
        }
    }

    async function handlerSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setTocado(true)
        setExito(null)
        setErrorApi(null)

        if (!resultados.success) return

        setEnviando(true)
        try {
            const creada = await createMesa(resultados.data)
            setMesaCreada(creada)
            setExito('Mesa creada exitosamente')
            setCapacidad('')
            setUsuarioId(soloSesion ? String(getUsuario()?.id ?? '') : '')
            setTocado(false)
        } catch (err) {
            // El 422 de aforo ("Se supera la capacidad del lugar…")
            // llega tal cual desde el backend.
            setErrorApi(err instanceof Error ? err.message : 'Error desconocido al crear la mesa')
        } finally {
            setEnviando(false)
        }
    }

    const opcionesUsuarios = usuarios.filter(
        user => user.activo || String(user.id) === usuarioId
    )

    return (
        <div className={s.page}>
            <Card className={s.card}>
                <h1 className={`text-headline-md ${s.title}`}>Nueva mesa</h1>
                <p className={`text-body-sm ${s.subtitle}`}>
                    La mesa nace ocupada (el cliente ya se sentó). El código de acceso
                    (PIN de 4 dígitos) se genera solo y es estable hasta cerrar la visita.
                </p>
                {aforoInfo && (
                    <p className={`text-body-sm ${s.subtitle}`}>{aforoInfo}</p>
                )}

                {exito && (
                    <Alert variant='success' className='text-body-md d-flex flex-wrap align-items-center justify-content-between gap-2'>
                        <span>{exito}</span>
                        <Button
                            className='text-label-md'
                            variant='outline-success'
                            size='sm'
                            type='button'
                            onClick={() => navigate(baseVuelta)}
                        >
                            Volver a la lista
                        </Button>
                    </Alert>
                )}
                {errorApi && <Alert variant='danger' className='text-body-md'>{errorApi}</Alert>}
                {errorUsuarios && <Alert variant='warning' className='text-body-md'>{errorUsuarios}</Alert>}

                <Form onSubmit={handlerSubmit} noValidate>
                    <div className={s.row}>
                        <Form.Group className={s.field} controlId='crear-mesa-capacidad'>
                            <Form.Label className={`text-label-md ${s.label}`}>Cantidad de personas para la mesa</Form.Label>
                            <Form.Control
                                className={s.input}
                                type='number'
                                min={1}
                                step={1}
                                placeholder='4'
                                value={capacidad}
                                onChange={(e) => setCapacidad(e.target.value)}
                                isInvalid={tocado && !!errores.capacidad}
                            />
                            <Form.Control.Feedback type='invalid'>{errores.capacidad}</Form.Control.Feedback>
                        </Form.Group>
                    </div>

                    {soloSesion ? (
                        <div className={s.field}>
                            <span className={`text-label-md ${s.label}`}>Mozo responsable</span>
                            <p className={`text-body-md ${s.subtitle}`}>
                                {getUsuario()?.nombre ?? 'Tu usuario'} (tu sesión)
                            </p>
                        </div>
                    ) : (
                        <Form.Group className={s.field} controlId='crear-mesa-usuario'>
                            <Form.Label className={`text-label-md ${s.label}`}>Mozo responsable (opcional)</Form.Label>
                            <Form.Select
                                className={s.input}
                                value={usuarioId}
                                onChange={(e) => setUsuarioId(e.target.value)}
                                disabled={cargandoUsuarios}
                                isInvalid={tocado && !!errores.usuario_id}
                            >
                                <option value=''>
                                    {cargandoUsuarios ? 'Cargando usuarios...' : 'Sin mozo asignado'}
                                </option>
                                {opcionesUsuarios.map(user => (
                                    <option value={user.id} key={user.id}>{user.nombre}</option>
                                ))}
                            </Form.Select>
                            <Form.Control.Feedback type='invalid'>{errores.usuario_id}</Form.Control.Feedback>
                        </Form.Group>
                    )}

                    <div className={s.actions}>
                        <Button className={s.button} variant='primary' type='submit' disabled={enviando}>
                            {enviando
                                ? <><Spinner size='sm' animation='border' className='me-2' />Creando...</>
                                : 'Crear mesa'}
                        </Button>
                        <Button
                            className={s.button}
                            variant='outline-secondary'
                            type='button'
                            disabled={enviando}
                            onClick={() => navigate(baseVuelta)}
                        >
                            Cancelar
                        </Button>
                    </div>
                </Form>
            </Card>

            <QrMesaModal mesa={mesaCreada} onCerrar={() => setMesaCreada(null)} />
        </div>
    )
}
