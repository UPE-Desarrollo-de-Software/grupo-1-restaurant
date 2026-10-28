import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap'
import s from './Mesas.module.css'
import { mesaSchema } from '../../../schemas/mesas'
import { getMesa, updateMesa } from '../../../api/mesas'
import { getConfiguracion } from '../../../api/configuracion'
import { getUsuarios } from '../../../api/usuarios'
import { CerrarMesaModal } from '../../../components/Mesas/CerrarMesaModal'
import type { Usuario } from '../../../types/Auth'

export function EditarMesaPage() {
    const { id } = useParams()
    const mesaId = Number(id)
    const navigate = useNavigate()

    const [capacidad, setCapacidad] = useState('')
    // Estado vigente de la mesa: no se muestra en la UI, pero PUT /mesas
    // lo exige en el payload (se conserva el que trae el GET).
    const [estadoActual, setEstadoActual] = useState('ocupada')
    const [usuarioId, setUsuarioId] = useState('')
    const [codigo, setCodigo] = useState<string | null>(null)
    const [copiado, setCopiado] = useState(false)
    const [aforoInfo, setAforoInfo] = useState<string | null>(null)
    const [modalCerrar, setModalCerrar] = useState(false)

    const [usuarios, setUsuarios] = useState<Usuario[]>([])
    const [cargandoUsuarios, setCargandoUsuarios] = useState(true)
    const [errorUsuarios, setErrorUsuarios] = useState<string | null>(null)

    const [cargando, setCargando] = useState(true)
    const [enviando, setEnviando] = useState(false)
    const [errorApi, setErrorApi] = useState<string | null>(null)
    const [exito, setExito] = useState<string | null>(null)
    const [tocado, setTocado] = useState(false)

    useEffect(() => {
        const controller = new AbortController()
        getMesa(mesaId, controller.signal)
            .then(mesa => {
                setCapacidad(String(mesa.capacidad))
                setEstadoActual(mesa.estado)
                setUsuarioId(mesa.usuario_id == null ? '' : String(mesa.usuario_id))
                setCodigo(mesa.codigo_acceso)
            })
            .catch(err => {
                if (!controller.signal.aborted) {
                    setErrorApi(err instanceof Error ? err.message : 'Error desconocido al cargar la mesa')
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setCargando(false)
            })
        return () => controller.abort()
    }, [mesaId])

    useEffect(() => {
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
    }, [])

    useEffect(() => {
        const controller = new AbortController()
        getConfiguracion(controller.signal)
            .then(config => {
                setAforoInfo(`Salón: aforo ${config.aforo} personas · hasta ${config.mesas_maximas} mesas`)
            })
            .catch(() => {
                // Sin aforo de referencia no se bloquea la edición.
            })
        return () => controller.abort()
    }, [])

    const errores: Record<string, string> = {}
    const resultados = mesaSchema.safeParse({ capacidad, estado: estadoActual, usuario_id: usuarioId })
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
            await updateMesa(mesaId, resultados.data)
            setExito('Mesa actualizada exitosamente')
            setTocado(false)
        } catch (err) {
            setErrorApi(err instanceof Error ? err.message : 'Error desconocido al actualizar la mesa')
        } finally {
            setEnviando(false)
        }
    }

    async function handlerCopiar() {
        if (!codigo) return
        try {
            await navigator.clipboard.writeText(codigo)
            setCopiado(true)
        } catch {
            setCopiado(false)
        }
    }

    const opcionesUsuarios = usuarios.filter(
        user => user.activo || String(user.id) === usuarioId
    )

    if (cargando) {
        return (
            <div className={s.page}>
                <Card className={s.card}>
                    <div className='d-flex justify-content-center py-4'>
                        <Spinner animation='border' />
                    </div>
                </Card>
            </div>
        )
    }

    return (
        <div className={s.page}>
            <Card className={s.card}>
                <h1 className={`text-headline-md ${s.title}`}>Editar mesa</h1>
                <p className={`text-body-sm ${s.subtitle}`}>
                    Modificá la cantidad de personas o el mozo responsable. El código de
                    acceso no se puede cambiar y bajar la capacidad por debajo de lo que
                    ya está ocupado da error (422 de aforo).
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
                            onClick={() => navigate('/gerente/mesas/gestion')}
                        >
                            Volver a la lista
                        </Button>
                    </Alert>
                )}
                {errorApi && <Alert variant='danger' className='text-body-md'>{errorApi}</Alert>}
                {errorUsuarios && <Alert variant='warning' className='text-body-md'>{errorUsuarios}</Alert>}

                {codigo && (
                    <div className={s.pinBox}>
                        <div>
                            <p className={`text-label-sm ${s.pinEtiqueta}`}>Código de acceso (PIN)</p>
                            <p className={`text-headline-md ${s.pinValor}`}>{codigo}</p>
                        </div>
                        <Button
                            size='sm'
                            variant={copiado ? 'success' : 'outline-secondary'}
                            className='text-label-md'
                            type='button'
                            onClick={handlerCopiar}
                        >
                            <i className={`bi ${copiado ? 'bi-check2' : 'bi-clipboard'} me-1`} aria-hidden='true' />
                            {copiado ? 'Copiado' : 'Copiar'}
                        </Button>
                    </div>
                )}

                <Form onSubmit={handlerSubmit} noValidate>
                    <Form.Group className={s.field} controlId='editar-mesa-capacidad'>
                        <Form.Label className={`text-label-md ${s.label}`}>Cantidad de personas</Form.Label>
                        <Form.Control
                            className={s.input}
                            type='number'
                            min={1}
                            step={1}
                            value={capacidad}
                            onChange={(e) => setCapacidad(e.target.value)}
                            isInvalid={tocado && !!errores.capacidad}
                        />
                        <Form.Control.Feedback type='invalid'>{errores.capacidad}</Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className={s.field} controlId='editar-mesa-usuario'>
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

                    <div className={s.actions}>
                        <Button className={s.button} variant='primary' type='submit' disabled={enviando}>
                            {enviando
                                ? <><Spinner size='sm' animation='border' className='me-2' />Guardando...</>
                                : 'Guardar cambios'}
                        </Button>
                        <Button
                            className={s.button}
                            variant='outline-secondary'
                            type='button'
                            disabled={enviando}
                            onClick={() => navigate('/gerente/mesas/gestion')}
                        >
                            Cancelar edición
                        </Button>
                    </div>
                </Form>
            </Card>

            <div className={s.zonaWrap}>
                <Button
                    variant='outline-danger'
                    className='text-label-md'
                    type='button'
                    onClick={() => setModalCerrar(true)}
                >
                    <i className='bi bi-door-open me-1' aria-hidden='true' />
                    Cerrar visita
                </Button>
                <p className={`text-body-sm ${s.subtitle} mb-0`}>
                    Si el cliente ya pagó, cerrá la visita: la mesa se elimina del sistema, su
                    código deja de valer y se cancelan sus reservas pendientes.
                </p>
            </div>

            <CerrarMesaModal
                visible={modalCerrar}
                mesaId={mesaId}
                numeroMesa={mesaId}
                onCancelar={() => setModalCerrar(false)}
                onCerrada={(aviso) => navigate('/gerente/mesas/gestion', { state: { aviso } })}
            />
        </div>
    )
}
