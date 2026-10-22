import { Card } from "react-bootstrap"
import type {PlatoListar} from  '../../types/Menu'
import s from './PlatoCard.module.css'
import { Link } from "react-router-dom";
import { BotonAgregarPlato } from "../Cliente/BotonAgregarPlato"

interface PlatoCardProps{
  plato: PlatoListar
}

const formatearPrecio = (precio: number): string =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(precio);

export function PlatoCard({plato}: PlatoCardProps){
  return(
   <Card className={s.card}>
      <Card.Body>
        <div className={s.info}>
          <h3 className={`text-headline-sm ${s.nombre}`}>
            {plato.nombre}
          </h3>
          <p className={`text-body-sm ${s.descripcion}`}>
            {plato.descripcion}
          </p>
          <p className={`text-price-display ${s.precio}`}>
            {formatearPrecio(plato.precio)}
          </p>
          <BotonAgregarPlato plato={plato} />

        </div>
      </Card.Body>
      <div className={s.media}>
        <Card.Img className={s.imagen} src={plato.imagen ?? undefined} alt={plato.nombre} loading="lazy"/>
        <Link className={s.link} to={`/plato/${plato.id}`}>
          <p className="text-body-sm">Ver detalles</p>
        </Link>
      </div>
   </Card> 
  )
}