import { useState } from 'react'
import s from './FiltroCategorias.module.css'

const CATEGORIAS = [
  { nombre: 'Todas', cantidad: 48 },
  { nombre: 'Carnes', cantidad: 14 },
  { nombre: 'Milanesas', cantidad: 8 },
  { nombre: 'Pastas', cantidad: 6 },
  { nombre: 'Postres', cantidad: 5 },
]

export function FiltroCategorias() {
  const [seleccionada, setSeleccionada] = useState('Todas')

  return (
    <div className={s.wrapper}>
      {CATEGORIAS.map(cat => (
        <button
          key={cat.nombre}
          type='button'
          className={`${s.chip} ${seleccionada === cat.nombre ? s.chipActivo : ''} text-label-md`}
          onClick={() => setSeleccionada(cat.nombre)}
        >
          {cat.nombre} {cat.cantidad}
        </button>
      ))}
    </div>
  )
}
