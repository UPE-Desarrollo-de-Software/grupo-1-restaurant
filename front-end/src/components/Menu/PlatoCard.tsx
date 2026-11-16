import { Card } from "react-bootstrap"
import { Link } from "react-router-dom"
import type {PlatoListar} from  '../../types/Menu'
import { BotonAgregarPlato } from "../Cliente/BotonAgregarPlato"
import s from './PlatoCard.module.css'

interface PlatoCardProps{
  plato: PlatoListar
}

const formatearPrecio = (precio: number): string =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(precio);

// Tarjeta de la carta: badge con la categoría real, nombre, descripción,
// precio e imagen a la derecha; abajo una franja con "Ver detalles" y el
// botón de agregar. El botón siempre está visible y el aviso de
// identificación lo resuelve BotonAgregarPlato.
export function PlatoCard({plato}: PlatoCardProps){
  return(
   <Card className={s.card}>
      <div className={s.cuerpo}>
        <div className={s.info}>
          {plato.categoria_nombre && (
            <span className={`text-label-sm ${s.categoria}`}>
              {plato.categoria_nombre}
            </span>
          )}
          <h3 className={`text-headline-sm ${s.nombre}`}>
            {plato.nombre}
          </h3>
          <p className={`text-body-sm ${s.descripcion}`}>
            {plato.descripcion}
          </p>
          <p className={`text-price-display ${s.precio}`}>
            {formatearPrecio(plato.precio)}
          </p>
        </div>
        <div className={s.media}>
          {plato.imagen_url
            ? <Card.Img
                className={s.imagen}
                src={plato.imagen_url}
                alt={plato.nombre}
                loading="lazy"
              />
            : <div className={`${s.imagen} ${s.imagenVacia}`} aria-hidden="true">
                <i className='bi bi-image' />
              </div>}
        </div>
      </div>
      <div className={s.footer}>
        <Link
          to={`/plato/${plato.id}`}
          className={`text-label-md ${s.verDetalles}`}
        >
          Ver detalles
          <i className='bi bi-arrow-right' aria-hidden='true' />
        </Link>
        <div className={s.acciones}>
          <BotonAgregarPlato plato={plato} />
        </div>
      </div>
   </Card>
  )
}