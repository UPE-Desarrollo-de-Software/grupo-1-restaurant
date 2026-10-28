import { Link } from 'react-router-dom'
import s from './HorariosServicio.module.css'

export function HorariosServicio(){
  return(
    <section className={s.section} aria-labelledby="horarios-title">
      <p className={`text-label-sm ${s.eyebrow}`}>
        <i className="bi bi-clock" aria-hidden="true" />
        Agender una reserva
      </p>
      <h2 id="horarios-title" className={`text-headline-md ${s.title}`}>
        Estamos esperándote
      </h2>
      <p className={`text-body-md ${s.texto}`}>
        Podés agender una reserva en el momento que quieras para cuando quieras.
      </p>
      <Link to="/reservas" className={`btn btn-primary ${s.cta}`}>
        {/* <i className="bi bi-calendar-check" aria-hidden="true" /> */}
        Reservar mesa
      </Link>
    </section>
  )
}
