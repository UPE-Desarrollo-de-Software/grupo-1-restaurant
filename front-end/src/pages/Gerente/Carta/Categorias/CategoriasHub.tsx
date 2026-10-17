import { BotonRedireccion } from "../../../../components/Carta/BotonRedireccion";
import { Buscador } from "../../../../components/Carta/Buscador";
import { Lista } from "../../../../components/Carta/Lista";
import { Resumen } from "../../../../components/Carta/Resumen";
import s from './Platos.module.css'

export function CategoriasPage() {
  return (
    <div className={`${s.page} ${s.hub}`}>
      <Buscador placeHolder='Buscar categoría por nombre...'/>
      <BotonRedireccion nombre='Nueva categoria' ruta='/gerente/carta/categorias/crear'/>
      <Resumen />
      <Lista tipo='categoria' />
    </div>
  )
}