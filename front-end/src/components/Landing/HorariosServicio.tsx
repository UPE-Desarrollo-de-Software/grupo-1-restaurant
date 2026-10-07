import { Link } from 'react-router-dom'
import s from './HorariosServicio.module.css'

interface Franja {
  dias: string
  horario: string
}

const FRANJAS: Franja[] = [
  { dias: 'Martes a jueves', horario: '12:00 – 15:30 · 20:00 – 23:30' },
  { dias: 'Viernes y sábados', horario: '12:00 – 16:00 · 19:30 – 00:30' },
  { dias: 'Domingos', horario: '12:00 – 16:00' },
]

export function HorariosServicio(){
  return(
    <section className={s.section} aria-labelledby="horarios-title">
      <p className={`text-label-sm ${s.eyebrow}`}>
        <i className="bi bi-clock" aria-hidden="true" />
        Horarios del servicio
      </p>
      <h2 id="horarios-title" className={`text-headline-md ${s.title}`}>
        Estamos esperándote
      </h2>
      <ul className={s.lista}>
        {FRANJAS.map(f => (
          <li key={f.dias} className={s.item}>
            <span className={`text-body-md ${s.dias}`}>{f.dias}</span>
            <span className={`text-body-md ${s.horario}`}>{f.horario}</span>
          </li>
        ))}
      </ul>
      <p className={`text-body-sm ${s.leyenda}`}>
        Los lunes descansamos. Último pedido 30 minutos antes del cierre.
      </p>
      <Link to="/reservas" className={`btn btn-primary ${s.cta}`}>
        {/* <i className="bi bi-calendar-check" aria-hidden="true" /> */}
        Reservar mesa
      </Link>
    </section>
  )
}
