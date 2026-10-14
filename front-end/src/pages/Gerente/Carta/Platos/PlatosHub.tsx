import { BuscadorPlatos } from '../../../../components/Platos/BuscadorPlatos'
import { BotonNuevoPlato } from '../../../../components/Platos/BotonNuevoPlato'
import { ResumenPlatos } from '../../../../components/Platos/ResumenPlatos'
import { FiltroCategorias } from '../../../../components/Platos/FiltroCategorias'
import { PlatosLista } from '../../../../components/Platos/PlatosLista'
import s from './Platos.module.css'

export function PlatosHubPage() {
  return (
    <div className={`${s.page} ${s.hub}`}>
      <BuscadorPlatos />
      <BotonNuevoPlato />
      <ResumenPlatos />
      <FiltroCategorias />
      <PlatosLista />
    </div>
  )
}
