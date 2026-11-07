import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap'
import s from './Usuarios.module.css'
import { usuarioEditSchema } from '../../../schemas/usuarios'
import { getRoles } from '../../../api/auth'
import { deleteUsuario, getUsuario, reactivarUsuario, updateUsuario } from '../../../api/usuarios'
import { ZonaPeligro } from '../../../components/ZonaPeligro/ZonaPeligro'
import type { Rol } from '../../../types/Auth'

export function EditarUsuarioPage() {
    const { id } = useParams()
    const navigate = useNavigate()

    const [nombre, setNombre] = useState('')
    const [rol_id, setRol] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [activo, setActivo] = useState(true)

    const [roles, setRoles] = useState<Rol[]>([])
    const [cargandoRoles, setCargandoRoles] = useState(true)
    const [errorRoles, setErrorRoles] = useState<string | null>(null)

    const [cargando, setCargando] = useState(true)
    const [enviando, setEnviando] = useState(false)
    const [eliminando, setEliminando] = useState(false)
    const [reactivando, setReactivando] = useState(false)
    const [errorApi, setErrorApi] = useState<string | null>(null)
    const [exito, setExito] = useState<string | null>(null)
    const [tocado, setTocado] = useState(false)

    useEffect(() => {
        const controllerRoles = new AbortController()
        getRoles(controllerRoles.signal)
            .then(setRoles)
            .catch(err => {
                if (!controllerRoles.signal.aborted) {
                    setErrorRoles(err instanceof Error ? err.message : 'Error desconocido al cargar los roles')
                }
            })
            .finally(() => {
                if (!controllerRoles.signal.aborted) setCargandoRoles(false)
            })
        return () => controllerRoles.abort()
    }, [])

    useEffect(() => {
        const controller = new AbortController()
        getUsuario(Number(id), controller.signal)
            .then(usuario => {
                setNombre(usuario.nombre)
                setEmail(usuario.email)
                setRol(String(usuario.rol_id))
                setActivo(usuario.activo)
            })
            .catch(err => {
                if (!controller.signal.aborted) {
                    setErrorApi(err instanceof Error ? err.message : 'Error desconocido al cargar el usuario')
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setCargando(false)
            })
        return () => controller.abort()
    }, [id])

    const errores: Record<string, string> = {}
    const resultados = usuarioEditSchema.safeParse({ nombre, rol_id, email, password, activo })
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
            await updateUsuario(Number(id), resultados.data)
            setExito('Usuario actualizado exitosamente')
            setPassword('')
            setTocado(false)
        } catch (err) {
            setErrorApi(err instanceof Error ? err.message : 'Error desconocido al actualizar el usuario')
        } finally {
            setEnviando(false)
        }
    }

    async function handlerEliminar() {
        setEliminando(true)
        setErrorApi(null)
        setExito(null)
        try {
            const rta = await deleteUsuario(Number(id))
            setExito(rta.message)
        } catch (err) {
            setErrorApi(err instanceof Error ? err.message : 'Error desconocido al eliminar el usuario')
        } finally {
            setEliminando(false)
        }
    }

    async function handlerReactivar() {
        setReactivando(true)
        setErrorApi(null)
        setExito(null)
        try {
            const rta = await reactivarUsuario(Number(id))
            setExito(rta.message)
            setActivo(true)
        } catch (err) {
            setErrorApi(err instanceof Error ? err.message : 'Error desconocido al reactivar el usuario')
        } finally {
            setReactivando(false)
        }
    }

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
                <h1 className={`text-headline-md ${s.title}`}>Editar usuario</h1>
                <p className={`text-body-sm ${s.subtitle}`}>Modificá los datos, el rol o el estado del usuario.</p>

                {exito && (
                    <Alert variant='success' className='text-body-md d-flex flex-wrap align-items-center justify-content-between gap-2'>
                        <span>{exito}</span>
                        <Button
                            className='text-label-md'
                            variant='outline-success'
                            size='sm'
                            type='button'
                            onClick={() => navigate('/gerente/usuarios')}
                        >
                            Volver a la lista
                        </Button>
                    </Alert>
                )}
                {errorApi && <Alert variant='danger' className='text-body-md'>{errorApi}</Alert>}
                {errorRoles && <Alert variant='danger' className='text-body-md'>{errorRoles}</Alert>}

                <Form onSubmit={handlerSubmit} noValidate>
                    <div className={s.row}>
                        <Form.Group className={s.field} controlId='editar-usuario-nombre'>
                            <Form.Label className={`text-label-md ${s.label}`}>Nombre</Form.Label>
                            <Form.Control
                                className={s.input}
                                type='text'
                                placeholder='Juan'
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                isInvalid={tocado && !!errores.nombre}
                            />
                            <Form.Control.Feedback type='invalid'>{errores.nombre}</Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group className={s.field} controlId='editar-usuario-rol'>
                            <Form.Label className={`text-label-md ${s.label}`}>Rol</Form.Label>
                            <Form.Select
                                className={s.input}
                                value={rol_id}
                                onChange={(e) => setRol(e.target.value)}
                                isInvalid={tocado && !!errores.rol_id}
                                disabled={cargandoRoles}
                            >
                                <option value='' disabled={true}>{cargandoRoles ? 'Cargando roles...' : 'Seleccioná un rol'}</option>
                                {roles.filter(r => r.nombre !== 'Cliente').map(r => (
                                    <option value={r.id} key={r.id}>{r.nombre}</option>
                                ))}
                            </Form.Select>
                            <Form.Control.Feedback type='invalid'>{errores.rol_id}</Form.Control.Feedback>
                        </Form.Group>
                    </div>

                    <div className={s.row}>
                        <Form.Group className={s.field} controlId='editar-usuario-email'>
                            <Form.Label className={`text-label-md ${s.label}`}>Correo electrónico</Form.Label>
                            <Form.Control
                                className={s.input}
                                type='email'
                                placeholder='juan@ejemplo.com'
                                autoComplete='email'
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                isInvalid={tocado && !!errores.email}
                            />
                            <Form.Control.Feedback type='invalid'>{errores.email}</Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group className={s.field} controlId='editar-usuario-password'>
                            <Form.Label className={`text-label-md ${s.label}`}>Contraseña (opcional)</Form.Label>
                            <Form.Control
                                className={s.input}
                                type='password'
                                placeholder='Dejar en blanco para mantener la actual'
                                autoComplete='new-password'
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                isInvalid={tocado && !!errores.password}
                            />
                            <Form.Control.Feedback type='invalid'>{errores.password}</Form.Control.Feedback>
                        </Form.Group>
                    </div>

                    <Form.Group className={s.field} controlId='editar-usuario-activo'>
                        <div className={s.switchWrap}>
                            <Form.Check
                                type='switch'
                                id='editar-usuario-activo-switch'
                                checked={activo}
                                onChange={(e) => setActivo(e.target.checked)}
                            />
                            <Form.Label className={`text-label-md ${s.label} mb-0`}>Activo</Form.Label>
                        </div>
                    </Form.Group>

                    <div className={s.actions}>
                        <Button className={s.button} variant='primary' type='submit' disabled={enviando || cargando}>
                            {enviando
                                ? <><Spinner size='sm' animation='border' className='me-2' />Guardando...</>
                                : 'Guardar cambios'}
                        </Button>
                        <Button
                            className={s.button}
                            variant='outline-secondary'
                            type='button'
                            disabled={enviando}
                            onClick={() => navigate('/gerente/usuarios')}
                        >
                            Cancelar edición
                        </Button>
                    </div>
                </Form>
            </Card>

            {!activo && (
                <div className={s.zonaWrap}>
                    <Button
                        className='w-100 text-label-md'
                        variant='outline-success'
                        type='button'
                        disabled={reactivando || eliminando}
                        onClick={handlerReactivar}
                    >
                        {reactivando
                            ? <><Spinner size='sm' animation='border' className='me-2' />Reactivando...</>
                            : <><i className='bi bi-arrow-counterclockwise me-2' aria-hidden='true' />Reactivar usuario</>}
                    </Button>
                </div>
            )}

            <div className={s.zonaWrap}>
                <ZonaPeligro
                    descripcion='Eliminar este usuario lo dará de baja: no podrá iniciar sesión en el sistema. Esta acción no borra su historial y puede reactivarse desde esta misma pantalla.'
                    textoBoton='Eliminar usuario'
                    eliminando={eliminando}
                    onEliminar={handlerEliminar}
                />
            </div>
        </div>
    )
}
