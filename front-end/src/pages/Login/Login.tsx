import { Card, Form, Button, Container, Alert, Spinner} from "react-bootstrap"
import s from './login.module.css'
import { Link, useNavigate } from "react-router-dom"
import React, { useState } from "react"
import { loginSchema } from "../../schemas/auth"
import { login, setSesion } from "../../api/auth"

export function LoginPage(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [tocado, setTocado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errorApi, setErrorApi] = useState<string | null>(null)
  const navigate = useNavigate()

  const resultado = loginSchema.safeParse({email, password})

  const errores: Record<string, string> = {}
  if (!resultado.success) {
    for (const issue of resultado.error.issues) {
      const campo = issue.path[0]
      if (typeof campo === "string" && !errores[campo]) {
        errores[campo] = issue.message
      }
    }
  }

  const handlerSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setTocado(true)

    if(!resultado.success) return
    setEnviando(true)
    setErrorApi(null)
    try {
      const {token, usuario} = await login(resultado.data)
      setSesion(token, usuario)
      navigate('/register')
    } catch (err) {
      setErrorApi(err instanceof Error ? err.message : "Error desconocido al iniciar sesión")
    }finally{
       setEnviando(false)
    }
  }

    return(
    <div className={s.page}>
      <Container>
        <Card className={s.card}>
          <Card.Body>
            <h1 className={`text-headline-md ${s.title}`}>Iniciar sesión</h1>
            <p className={`text-body-sm ${s.subtitle}`}>
              ¡Ingresá tus datos para continuar!
            </p>
            
            {errorApi && <Alert variant="danger" className="text-center">{errorApi}</Alert>}
            
            <Form noValidate onSubmit={handlerSubmit}>
              <Form.Group className={s.field} controlId="login-email">
                <Form.Label className={`text-label-md ${s.label}`}>
                  Correo electrónico
                </Form.Label>
                <Form.Control
                  className={s.input}
                  type="email"
                  placeholder="nombre@ejemplo.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  isInvalid={tocado && !!errores.email}
                />
                <Form.Control.Feedback type="invalid">
                  {errores.email}
                </Form.Control.Feedback>
              </Form.Group>

              <Form.Group className={s.field} controlId="login-password">
                <Form.Label className={`text-label-md ${s.label}`}>
                  Contraseña
                </Form.Label>
                <Form.Control
                  className={s.input}
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  isInvalid={tocado && !!errores.password}
                />
              <Form.Control.Feedback type="invalid">
                  {errores.password}
              </Form.Control.Feedback>
              </Form.Group>

              <Button className={s.button} variant="primary" type="submit" disabled={enviando}>
                {enviando ? <><Spinner size="sm" animation="border" className="me-2" />Ingresando...</> : "Ingresar"}
              </Button>

              <Link to={'/register'} className={s.link}>
                  <p className='text-body-md text-center mt-2'>¿Olvidaste tu contraseña?</p>
              </Link>

            </Form>
          </Card.Body>
        </Card>
      </Container>
    </div>

    )
}