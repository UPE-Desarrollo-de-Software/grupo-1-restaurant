import { useProductos } from '../../hooks/useProductos'
import s from './MenuList.module.css'
import { ProductoCard } from './ProductCard'

export function MenuList(){
  const {productos, loading, error} = useProductos()

  if(loading){
    return <p className='text-body-md text-center'>Cargando productos...</p>
  }

  if(error){
    return <p className='text-body-md text-center'>{error}</p>
  }

  if(productos.length === 0){
    return <p className='text-body-md text-center'>No hay productos cargados todavía</p>
  }

  return(
    <ul className={s.list}>
      {productos.map(p => (
        <li key={p.id}>
          <ProductoCard producto={p}/>
        </li>
      ))}
    </ul>
  )
}