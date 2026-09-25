import { Card } from "react-bootstrap"
import type {Producto} from  '../../types/Producto'
import s from './ProductCard.module.css'
import { Link } from "react-router-dom";

interface ProductoCardProps{
  producto: Producto
}

const formatearPrecio = (precio: number): string =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(precio);

export function ProductoCard({producto}: ProductoCardProps){
  return(
   <Card className={s.card}>
      <Card.Body>
        <div className={s.info}>
          <h3 className={`text-headline-sm ${s.nombre}`}>
            {producto.nombre}
          </h3>
          <p className={`text-body-sm ${s.descripcion}`}>
            {producto.descripcion}
          </p>
          <p className={`text-price-display ${s.precio}`}>
            {formatearPrecio(producto.precio)}
          </p>

        </div>
      </Card.Body>
      <div className={s.media}>
        <Card.Img className={s.imagen} src={producto.imagen} alt={producto.nombre} loading="lazy"/>
        <Link className={s.link} to={`/producto/${producto.id}`}>
          <p className="text-body-sm">Ver detalles</p>
        </Link>
      </div>
   </Card> 
  )
}