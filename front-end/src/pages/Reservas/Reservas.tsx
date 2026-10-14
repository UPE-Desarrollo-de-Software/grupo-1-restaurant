import { useState } from 'react'
import type { FormEvent } from 'react'
import { Alert, Button, Card, Col, Container, Form, Row } from 'react-bootstrap'
import { obtenerFechaLocal, obtenerHorariosDisponibles } from '../../data/reservasMock'
import s from './reservas.module.css'

interface ReservaFormData {
  fecha: string
  personas: string
  horario: string
  nombre: string
  email: string
  telefono: string
}

type CampoReserva = keyof ReservaFormData
type ErroresReserva = Partial<Record<CampoReserva, string>>

const FORMULARIO_VACIO: ReservaFormData = {
  fecha: '',
  personas: '2',
  horario: '',
  nombre: '',
  email: '',
  telefono: '',
}

function validarReserva(
  formulario: ReservaFormData,
  horariosDisponibles: string[],
  fechaMinima: string,
): ErroresReserva {
  const errores: ErroresReserva = {}
  const telefonoNormalizado = formulario.telefono.replace(/\D/g, '')

  if (!formulario.fecha) {
    errores.fecha = 'Seleccioná la fecha de la reserva.'
  } else if (formulario.fecha < fechaMinima) {
    errores.fecha = 'La fecha no puede ser anterior al día de hoy.'
  }

  if (!formulario.personas) {
    errores.personas = 'Seleccioná la cantidad de personas.'
  }

  if (!formulario.horario) {
    errores.horario = 'Seleccioná un horario disponible.'
  } else if (!horariosDisponibles.includes(formulario.horario)) {
    errores.horario = 'Ese horario ya no está disponible. Elegí otro.'
  }

  if (!formulario.nombre.trim()) {
    errores.nombre = 'Ingresá tu nombre.'
  }

  if (!formulario.email.trim()) {
    errores.email = 'Ingresá tu correo electrónico.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formulario.email.trim())) {
    errores.email = 'Ingresá un correo electrónico válido.'
  }

  if (!formulario.telefono.trim()) {
    errores.telefono = 'Ingresá tu teléfono.'
  } else if (telefonoNormalizado.length < 7 || telefonoNormalizado.length > 15) {
    errores.telefono = 'Ingresá un teléfono válido, con entre 7 y 15 números.'
  }

  return errores
}

function formatearFecha(fecha: string): string {
  if (!fecha) return 'Elegí una fecha'
  const [anio, mes, dia] = fecha.split('-').map(Number)
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(anio, mes - 1, dia))
}

export function ReservasPage() {
  const fechaHoy = obtenerFechaLocal(new Date())
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO)
  const [errores, setErrores] = useState<ErroresReserva>({})
  const [intentoConfirmar, setIntentoConfirmar] = useState(false)
  const [reservaConfirmada, setReservaConfirmada] = useState<ReservaFormData | null>(null)
  const horariosDisponibles = obtenerHorariosDisponibles(formulario.fecha)

  function actualizarCampo(campo: CampoReserva, valor: string) {
    setFormulario((actual) => ({ ...actual, [campo]: valor }))
    setErrores((actuales) => ({ ...actuales, [campo]: undefined }))
    setReservaConfirmada(null)
  }

  function cambiarFecha(fecha: string) {
    setFormulario((actual) => ({
      ...actual,
      fecha,
      horario: obtenerHorariosDisponibles(fecha).includes(actual.horario)
        ? actual.horario
        : '',
    }))
    setErrores((actuales) => ({
      ...actuales,
      fecha: undefined,
      horario: undefined,
    }))
    setReservaConfirmada(null)
  }

  function confirmarReserva(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setIntentoConfirmar(true)

    const erroresValidacion = validarReserva(
      formulario,
      horariosDisponibles,
      fechaHoy,
    )
    setErrores(erroresValidacion)

    if (Object.keys(erroresValidacion).length > 0) return

    setReservaConfirmada({
      ...formulario,
      nombre: formulario.nombre.trim(),
      email: formulario.email.trim(),
      telefono: formulario.telefono.trim(),
    })
  }

  function iniciarNuevaReserva() {
    setFormulario(FORMULARIO_VACIO)
    setErrores({})
    setIntentoConfirmar(false)
    setReservaConfirmada(null)
  }

  return (
    <Container className={s.page}>
      <header className={s.header}>
        <span className={s.eyebrow}>
          <i className="bi bi-calendar-heart" aria-hidden="true" />
          GastroApp
        </span>
        <h1 className={s.title}>Reservá tu mesa</h1>
        <p className={s.subtitle}>
          Elegí el día y el horario. Nosotros nos ocupamos de preparar todo para recibirte.
        </p>
      </header>

      {reservaConfirmada ? (
        <Card className={s.confirmation}>
          <Card.Body>
            <div className={s.confirmationIcon} aria-hidden="true">
              <i className="bi bi-check-lg" />
            </div>
            <h2 className={s.confirmationTitle}>¡Reserva confirmada!</h2>
            <p className={s.confirmationText}>
              Tu mesa fue reservada correctamente. Te esperamos.
            </p>
            <ReservationSummary
              formulario={reservaConfirmada}
              esConfirmacion
            />
            <Button variant="outline-primary" onClick={iniciarNuevaReserva}>
              Hacer otra reserva
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <Row className="g-4">
          <Col lg={7}>
            <Card className={s.formCard}>
              <Card.Body>
                <Form noValidate onSubmit={confirmarReserva}>
                  <section className={s.formSection} aria-labelledby="visit-title">
                    <h2 id="visit-title" className={s.sectionTitle}>
                      <span className={s.step}>1</span>
                      Tu visita
                    </h2>

                    <Form.Group className={s.field} controlId="reserva-fecha">
                      <Form.Label className={s.label}>Fecha</Form.Label>
                      <Form.Control
                        type="date"
                        min={fechaHoy}
                        value={formulario.fecha}
                        onChange={(evento) => cambiarFecha(evento.target.value)}
                        isInvalid={intentoConfirmar && !!errores.fecha}
                        aria-describedby={errores.fecha ? 'reserva-fecha-error' : undefined}
                        required
                      />
                      <Form.Control.Feedback id="reserva-fecha-error" type="invalid">
                        {errores.fecha}
                      </Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className={s.field} controlId="reserva-personas">
                      <Form.Label className={s.label}>Cantidad de personas</Form.Label>
                      <Form.Select
                        value={formulario.personas}
                        onChange={(evento) => actualizarCampo('personas', evento.target.value)}
                        isInvalid={intentoConfirmar && !!errores.personas}
                        required
                      >
                        {Array.from({ length: 6 }, (_, indice) => indice + 1).map((cantidad) => (
                          <option key={cantidad} value={cantidad}>
                            {cantidad} {cantidad === 1 ? 'persona' : 'personas'}
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">
                        {errores.personas}
                      </Form.Control.Feedback>
                    </Form.Group>

                    <fieldset className={s.fieldset}>
                      <legend className={s.label}>Horario</legend>
                      {!formulario.fecha ? (
                        <p className={s.helperText}>Primero seleccioná una fecha.</p>
                      ) : horariosDisponibles.length === 0 ? (
                        <Alert variant="info" className={s.availabilityMessage}>
                          No hay horarios disponibles para esta fecha. Probá con otro día.
                        </Alert>
                      ) : (
                        <div className={s.times}>
                          {horariosDisponibles.map((horario) => (
                            <Button
                              key={horario}
                              type="button"
                              variant={formulario.horario === horario ? 'primary' : 'outline-primary'}
                              className={s.time}
                              aria-pressed={formulario.horario === horario}
                              onClick={() => actualizarCampo('horario', horario)}
                            >
                              {horario}
                            </Button>
                          ))}
                        </div>
                      )}
                      {intentoConfirmar && errores.horario && (
                        <p className={s.fieldError} role="alert">{errores.horario}</p>
                      )}
                    </fieldset>
                  </section>

                  <section className={s.formSection} aria-labelledby="contact-title">
                    <h2 id="contact-title" className={s.sectionTitle}>
                      <span className={s.step}>2</span>
                      Tus datos
                    </h2>

                    <Form.Group className={s.field} controlId="reserva-nombre">
                      <Form.Label className={s.label}>Nombre y apellido</Form.Label>
                      <Form.Control
                        type="text"
                        autoComplete="name"
                        placeholder="Ej.: Ciro Coria"
                        value={formulario.nombre}
                        onChange={(evento) => actualizarCampo('nombre', evento.target.value)}
                        isInvalid={intentoConfirmar && !!errores.nombre}
                        required
                      />
                      <Form.Control.Feedback type="invalid">
                        {errores.nombre}
                      </Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className={s.field} controlId="reserva-email">
                      <Form.Label className={s.label}>Correo electrónico</Form.Label>
                      <Form.Control
                        type="email"
                        autoComplete="email"
                        placeholder="nombre@ejemplo.com"
                        value={formulario.email}
                        onChange={(evento) => actualizarCampo('email', evento.target.value)}
                        isInvalid={intentoConfirmar && !!errores.email}
                        required
                      />
                      <Form.Control.Feedback type="invalid">
                        {errores.email}
                      </Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className={s.field} controlId="reserva-telefono">
                      <Form.Label className={s.label}>Teléfono</Form.Label>
                      <Form.Control
                        type="tel"
                        autoComplete="tel"
                        placeholder="Ej.: 11 2345 6789"
                        value={formulario.telefono}
                        onChange={(evento) => actualizarCampo('telefono', evento.target.value)}
                        isInvalid={intentoConfirmar && !!errores.telefono}
                        required
                      />
                      <Form.Control.Feedback type="invalid">
                        {errores.telefono}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </section>

                  <Button className={s.submitButton} variant="primary" type="submit">
                    <i className="bi bi-calendar-check me-2" aria-hidden="true" />
                    Confirmar reserva
                  </Button>
                  <p className={s.mockNotice}>
                    Esta reserva es una simulación y no se enviará al restaurante.
                  </p>
                </Form>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={5}>
            <ReservationSummary formulario={formulario} />
          </Col>
        </Row>
      )}
    </Container>
  )
}

function ReservationSummary({
  formulario,
  esConfirmacion = false,
}: {
  formulario: ReservaFormData
  esConfirmacion?: boolean
}) {
  const cantidadPersonas = Number(formulario.personas)

  return (
    <section
      className={`${s.summary} ${esConfirmacion ? s.confirmationSummary : ''}`}
      aria-labelledby={esConfirmacion ? 'confirmation-summary-title' : 'summary-title'}
    >
      <h2
        id={esConfirmacion ? 'confirmation-summary-title' : 'summary-title'}
        className={s.summaryTitle}
      >
        Tu reserva
      </h2>
      <dl className={s.summaryList}>
        <div className={s.summaryItem}>
          <dt><i className="bi bi-calendar3" aria-hidden="true" /> Fecha</dt>
          <dd>{formatearFecha(formulario.fecha)}</dd>
        </div>
        <div className={s.summaryItem}>
          <dt><i className="bi bi-clock" aria-hidden="true" /> Hora</dt>
          <dd>{formulario.horario || 'Elegí un horario'}</dd>
        </div>
        <div className={s.summaryItem}>
          <dt><i className="bi bi-people" aria-hidden="true" /> Personas</dt>
          <dd>
            {cantidadPersonas} {cantidadPersonas === 1 ? 'persona' : 'personas'}
          </dd>
        </div>
        <div className={s.summaryItem}>
          <dt><i className="bi bi-person" aria-hidden="true" /> Nombre</dt>
          <dd>{formulario.nombre.trim() || 'A completar'}</dd>
        </div>
        {esConfirmacion && (
          <>
            <div className={s.summaryItem}>
              <dt><i className="bi bi-envelope" aria-hidden="true" /> Email</dt>
              <dd>{formulario.email}</dd>
            </div>
            <div className={s.summaryItem}>
              <dt><i className="bi bi-telephone" aria-hidden="true" /> Teléfono</dt>
              <dd>{formulario.telefono}</dd>
            </div>
          </>
        )}
      </dl>
      {!esConfirmacion && (
        <p className={s.summaryHint}>
          El resumen se actualiza a medida que completás tus datos.
        </p>
      )}
    </section>
  )
}
