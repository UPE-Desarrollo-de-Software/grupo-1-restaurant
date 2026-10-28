import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap'
import s from './Usuarios.module.css'
import { registerSchema } from '../../../schemas/usuarios'
import { getRoles } from '../../../api/auth'
import { createUsuario } from '../../../api/usuarios'
import type { Rol } from '../../../types/Auth'

export function CrearUsuarioPage() {
    const navigate = useNavigate()
    const [nombre, setNombre] = useState('')
    const [rol_id, setRol] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const [roles, setRoles] = useState<Rol[]>([])
    const [cargandoRoles, setCargandoRoles] = useState(true)
    const [errorRoles, setErrorRoles] = useState<string | null>(null)

    const [enviando, setEnviando] = useState(false)
    const [errorApi, setErrorApi] = useState<string | null>(null)
    const [exito, setExito] = useState<string | null>(null)
    const [tocado, setTocado] = useState(false)

    const errores: Record<string, string> = {}
    const resultados = registerSchema.safeParse({ nombre, rol_id, email, password })
    if (!resultados.success) {
        for (const issue of resultados.error.issues) {
            const campo = issue.path[0]
            if (typeof campo === 'string' && !errores[campo]) {
                errores[campo] = issue.message
            }
        }
    }

    useEffect(() => {
        const controller = new AbortController()
        getRoles(controller.signal)
            .then(setRoles)
            .catch(err => {
                if (!controller.signal.aborted) {
                    setErrorRoles(err instanceof Error ? err.message : 'Error desconocido al cargar los roles')
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setCargandoRoles(false)
            })
        return () => controller.abort()
    }, [])

    async function handlerSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setTocado(true)
        setExito(null)
        setErrorApi(null)

        if (!resultados.success) return

        setEnviando(true)
        try {
            await createUsuario(resultados.data)
            setExito('Usuario creado exitosamente')
            setNombre('')
            setRol('')
            setEmail('')
            setPassword('')
            setTocado(false)
        } catch (err) {
            setErrorApi(err instanceof Error ? err.message : 'Error desconocido al crear el usuario')
        } finally {
            setEnviando(false)
        }
    }

    return (
        <div className={s.page}>
            <Card className={s.card}>
                <h1 className={`text-headline-md ${s.title}`}>Nuevo usuario</h1>
                <p className={`text-body-sm ${s.subtitle}`}>El usuario creado podrá ingresar al sistema con su rol.</p>

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
                        <Form.Group className={s.field} controlId='crear-usuario-nombre'>
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

                        <Form.Group className={s.field} controlId='crear-usuario-rol'>
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
                        <Form.Group className={s.field} controlId='crear-usuario-email'>
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

                        <Form.Group className={s.field} controlId='crear-usuario-password'>
                            <Form.Label className={`text-label-md ${s.label}`}>Contraseña</Form.Label>
                            <Form.Control
                                className={s.input}
                                type='password'
                                placeholder='••••••••'
                                autoComplete='new-password'
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                isInvalid={tocado && !!errores.password}
                            />
                            <Form.Control.Feedback type='invalid'>{errores.password}</Form.Control.Feedback>
                        </Form.Group>
                    </div>

                    <div className={s.actions}>
                        <Button className={s.button} variant='primary' type='submit' disabled={enviando}>
                            {enviando
                                ? <><Spinner size='sm' animation='border' className='me-2' />Creando...</>
                                : 'Crear usuario'}
                        </Button>
                        <Button
                            className={s.button}
                            variant='outline-secondary'
                            type='button'
                            disabled={enviando}
                            onClick={() => navigate('/gerente/usuarios')}
                        >
                            Cancelar
                        </Button>
                    </div>
                </Form>
            </Card>
        </div>
    )
}
