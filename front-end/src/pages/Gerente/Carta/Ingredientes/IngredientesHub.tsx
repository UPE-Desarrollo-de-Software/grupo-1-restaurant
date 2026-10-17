import { useState } from 'react'
import { Buscador } from '../../../../components/Carta/Buscador'
import { BotonRedireccion } from '../../../../components/Carta/BotonRedireccion'
import { Resumen } from '../../../../components/Carta/Resumen'
import { Lista } from '../../../../components/Carta/Lista'
import s from './Platos.module.css'

export function IngredientesHubPage() {
  const [busqueda, setBusqueda] = useState('')

  return (
    <div className={`${s.page} ${s.hub}`}>
      <Buscador
        placeHolder='Buscar ingrediente por nombre o id...'
        valor={busqueda}
        onCambio={setBusqueda}
      />
      <BotonRedireccion nombre='Nuevo Ingrediente' ruta='/gerente/carta/ingredientes/crear'/>
      <Resumen />
      <Lista tipo='ingrediente' busqueda={busqueda} />
    </div>
  )
}
