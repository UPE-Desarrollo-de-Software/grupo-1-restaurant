import { Link } from 'react-router-dom'
import s from './CartaAbierta.module.css'

export function CartaAbierta(){
  return(
    <section className={s.section} aria-labelledby="carta-abierta-title">
      <p className={`text-label-sm ${s.eyebrow}`}>
        <i className="bi bi-fork-knife" aria-hidden="true" />
        Carta abierta
      </p>
      <h1 id="carta-abierta-title" className={`text-headline-lg ${s.title}`}>
        Descubrí nuestra propuesta
      </h1>
      <p className={`text-body-md ${s.texto}`}>
        Explorá nuestra carta, conocé nuestras opciones y encontrá
        la propuesta ideal para disfrutar tu próxima experiencia.
      </p>
      <Link to="/menu" className={`btn btn-primary ${s.cta}`}>
        Ver la carta
      </Link>
    </section>
  )
}