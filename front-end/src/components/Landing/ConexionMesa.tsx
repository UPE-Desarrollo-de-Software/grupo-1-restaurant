import { Link } from 'react-router-dom'
import s from './ConexionMesa.module.css'

export function ConexionMesa(){
  return(
    <section className={s.section} aria-labelledby="conexion-mesa-title">
      <div className={s.header}>
        <span className={s.icono} aria-hidden="true">
          <i className="bi bi-phone" />
        </span>
        <h2 id="conexion-mesa-title" className={`text-headline-sm ${s.title}`}>
          ¿Ya estás en tu mesa?
        </h2>
      </div>
      <p className={`text-body-md ${s.texto}`}>
        Solicita a tu mozo el PIN de 4 dígitos para ordenar,
        personalizar platos o unirte a un pedido grupal.
      </p>
      <Link to="/unir-mesa" className={`btn ${s.cta}`}>
        <i className="bi bi-box-arrow-in-right" aria-hidden="true" />
        Conectar Mesa (con PIN)
      </Link>
    </section>
  )
}
