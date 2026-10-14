import { useState } from 'react'
import { useProductos } from '../../hooks/useProductos'
import { PlatoCard } from './PlatoCard'
import s from './PlatosLista.module.css'

export function PlatosLista() {
  const { productos, loading, error } = useProductos()
  const [overrides, setOverrides] = useState<Map<number, boolean>>(new Map())

  function toggle(id: number, actual: boolean) {
    setOverrides(prev => {
      const next = new Map(prev)
      next.set(id, !actual)
      return next
    })
  }

  if (loading) {
    return <p className='text-body-md text-center'>Cargando productos...</p>
  }

  if (error) {
    return <p className='text-body-md text-center'>{error}</p>
  }

  if (productos.length === 0) {
    return <p className='text-body-md text-center'>No hay productos cargados todavía</p>
  }

  return (
    <ul className={s.list}>
      {productos.map(p => {
        const disponible = overrides.get(p.id) ?? p.disponible
        return (
          <li key={p.id}>
            <PlatoCard
              producto={p}
              disponible={disponible}
              onToggle={() => toggle(p.id, disponible)}
            />
          </li>
        )
      })}
    </ul>
  )
}
