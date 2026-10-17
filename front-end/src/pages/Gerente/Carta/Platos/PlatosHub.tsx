import { Buscador } from '../../../../components/Carta/Buscador'
import { BotonRedireccion } from '../../../../components/Carta/BotonRedireccion'
import { Resumen } from '../../../../components/Carta/Resumen'
import { FiltroCategorias } from '../../../../components/Platos/FiltroCategorias'
import { Lista } from '../../../../components/Carta/Lista'
import s from './Platos.module.css'

export function PlatosHubPage() {
  return (
    <div className={`${s.page} ${s.hub}`}>
      <Buscador placeHolder='Buscar por nombre, código o ingrediente'/>
      <BotonRedireccion nombre='Nuevo Plato' ruta='/gerente/carta/platos/crear'/>
      <Resumen />
      <FiltroCategorias />
      <Lista tipo='plato' />
    </div>
  )
}
