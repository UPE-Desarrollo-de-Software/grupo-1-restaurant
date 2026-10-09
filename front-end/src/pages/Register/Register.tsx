import { Card, Container, Form, Button, Spinner, Alert } from 'react-bootstrap'
import s from '../Login/login.module.css'
import { useState, useEffect, useRef } from 'react'
import { registerSchema } from '../../schemas/auth'
import { register } from '../../api/auth'
import { useRoles } from '../../context/RolesContext/useRoles'

export function RegisterPage(){
    const [nombre, setNombre] = useState("")
    const [rol_id, setRol] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")

    const [enviando, setEnviando] = useState(false)
    const [errorApi, setErrorApi] = useState<string | null>(null)
    const [tocado, setTocado] = useState(false)
    const [registroExitoso, setRegistroExitoso] = useState<string | null>(null)
    const timerRef = useRef<number|null>(null)

    const { roles } = useRoles()

    const resultados = registerSchema.safeParse({nombre, rol_id, email, password})  
    
    const errores: Record<string, string> = {}
    if (!resultados.success) {
        for (const issue of resultados.error.issues) {
        const campo = issue.path[0]
        if (typeof campo === "string" && !errores[campo]) {
            errores[campo] = issue.message
        }
        }
    }

    useEffect(()=>{
        return()=>{
            if(timerRef.current) window.clearTimeout(timerRef.current)
        }
    },[])

    async function handlerSubmit(e:  React.FormEvent<HTMLFormElement>){
        e.preventDefault()
        setTocado(true)

        if(!resultados.success) return

        if(timerRef.current) window.clearTimeout(timerRef.current)
        setRegistroExitoso(null)

        setEnviando(true)
        setErrorApi(null)
        try {
            const usuario = await register(resultados.data)
            setRegistroExitoso(usuario.message)
            timerRef.current = window.setTimeout(() => {
                setRegistroExitoso(null)
                setNombre("")
                setRol("")
                setEmail("")
                setPassword("")
                setTocado(false)
                timerRef.current = null
            }, 3000)
        } catch (err) {
            setErrorApi(err instanceof Error ? err.message : 'Error desconocido al registrar usuario')
        }finally{
            setEnviando(false)
        }
    }

    return(
        <div className={s.page}>
            <Container>
                <Card className={s.card}>
                    <Card.Body>
                        <h1 className={`text-headline-md ${s.title}`}>Creá una cuenta</h1>
                        <p className={`text-body-sm ${s.subtitle}`}>
                            ¡Registra usuarios en segundos!
                        </p>

                        {errorApi && <Alert variant='danger' className='text-center'>{errorApi}</Alert>}
                        {registroExitoso && <Alert variant='success' className='text-center'>{registroExitoso}</Alert>}

                        <Form onSubmit={handlerSubmit} noValidate>

                            <Form.Group className={s.field} controlId="register-name">
                                <Form.Label className={`text-label-md ${s.label}`}>
                                    Nombre
                                </Form.Label>
                                <Form.Control 
                                className={s.input}
                                type='text'
                                placeholder='Juan'
                                value={nombre}
                                onChange={(e)=>setNombre(e.target.value)}
                                isInvalid={tocado && !!errores.nombre}
                                />
                                <Form.Control.Feedback type='invalid'>
                                    {errores.nombre}
                                </Form.Control.Feedback>
                            </Form.Group>

                            <Form.Group className={s.field} controlId="register-rol">
                                <Form.Label className={`text-label-md ${s.label}`}>
                                    Rol
                                </Form.Label>
                                <Form.Select value={rol_id} onChange={(e)=>setRol(e.target.value)} isInvalid={tocado && !!errores.rol_id}>
                                    <option value="" disabled={true}>Seleccioná un rol</option>
                                    {roles.filter(r => r.nombre !== 'Cliente').map(r=>(
                                        <option value={r.id} key={r.id}>{r.nombre}</option>
                                    ))}
                                </Form.Select>
                                <Form.Control.Feedback type='invalid'>
                                    {errores.rol_id}
                                </Form.Control.Feedback>
                            </Form.Group>

                            <Form.Group className={s.field} controlId="register-email">
                                <Form.Label className={`text-label-md ${s.label}`}>
                                    Correo electrónico
                                </Form.Label>
                                <Form.Control
                                    className={s.input}
                                    type="email"
                                    placeholder="juan@ejemplo.com"
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    isInvalid={tocado && !!errores.email}
                                />
                                <Form.Control.Feedback type='invalid'>
                                    {errores.email}
                                </Form.Control.Feedback>
                            </Form.Group>

                            <Form.Group className={s.field} controlId="register-password">
                                <Form.Label className={`text-label-md ${s.label}`}>
                                    Contraseña
                                </Form.Label>
                                <Form.Control
                                    className={s.input}
                                    type="password"
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                    value={password}
                                    onChange={(e)=> setPassword(e.target.value)}
                                    isInvalid={tocado && !!errores.password}
                                />
                                <Form.Control.Feedback type='invalid'>
                                    {errores.password}
                                </Form.Control.Feedback>
                            </Form.Group>

                            <Button className={s.button} variant="primary" type="submit" disabled={enviando}>
                                {enviando ? <> <Spinner size='sm' animation='border' className='me-2'/>Registrando...</> : "Registrarse"}
                            </Button>
                        </Form>
                    </Card.Body>
                </Card>
            </Container>
        </div>
    )
}