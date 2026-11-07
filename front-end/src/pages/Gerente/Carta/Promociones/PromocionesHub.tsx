import { useState } from 'react'
import { Buscador } from '../../../../components/Carta/Buscador'
import { BotonRedireccion } from '../../../../components/Carta/BotonRedireccion'
import { Resumen } from '../../../../components/Carta/Resumen'
import { Lista } from '../../../../components/Carta/Lista'
import { useDatos } from '../../../../hooks/useDatos'
import s from './Promociones.module.css'

export function PromocionesHubPage() {
  const [busqueda, setBusqueda] = useState('')
  const { items, loading, error } = useDatos('promocion')

  return (
    <div className={`${s.page} ${s.hub}`}>
      <Buscador
        placeHolder='Buscar promoción por nombre o id...'
        valor={busqueda}
        onCambio={setBusqueda}
      />
      <BotonRedireccion nombre='Nueva Promoción' ruta='/gerente/carta/promociones/crear'/>
      <Resumen tipo='promocion' items={items} loading={loading} />
      <Lista tipo='promocion' items={items} loading={loading} error={error} busqueda={busqueda} />
    </div>
  )
}
