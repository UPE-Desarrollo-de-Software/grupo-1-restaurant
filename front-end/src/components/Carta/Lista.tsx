import type { ReactNode } from 'react'
import { useDatos } from '../../hooks/useDatos'
import type { ItemLista, Tipo } from '../../hooks/useDatos'
import type { Categoria, Ingrediente, PlatoListar } from '../../types/Menu'
import { PlatoCard } from '../Platos/PlatoCard'
import { IngredienteCard } from '../Ingredientes/IngredienteCard'
import { CategoriaCard } from '../Categorias/CategoriaCard'
import s from './Lista.module.css'

type Config = {
  Card: (props: { item: ItemLista }) => ReactNode
  cargando: string
  vacio: string
}

const CONFIG: Record<Tipo, Config> = {
  plato: {
    Card: ({ item }) => <PlatoCard plato={item as PlatoListar} />,
    cargando: 'Cargando platos...',
    vacio: 'No hay platos cargados todavía',
  },
  ingrediente: {
    Card: ({ item }) => <IngredienteCard ingrediente={item as Ingrediente} />,
    cargando: 'Cargando ingredientes...',
    vacio: 'No hay ingredientes cargados todavía',
  },
  categoria: {
    Card: ({ item }) => <CategoriaCard categoria={item as Categoria} />,
    cargando: 'Cargando categorías...',
    vacio: 'No hay categorías cargadas todavía',
  },
}

const SIN_RESULTADOS: Record<Tipo, string> = {
  plato: 'No se encontraron platos',
  ingrediente: 'No se encontraron ingredientes',
  categoria: 'No se encontraron categorías',
}

// Minúsculas + sin acentos: "huevo" encuentra "Huevo Frito".
// No se exporta: react-refresh/only-export-components (ver PlatoCard.formatearPrecio).
const normalizar = (texto: string): string =>
  texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

function filtrar(items: ItemLista[], busqueda?: string): ItemLista[] {
  const consulta = normalizar((busqueda ?? '').trim().replace(/^#/, ''))
  if (!consulta) return items

  return items.filter(item =>
    normalizar(item.nombre).includes(consulta)
    || String(item.id).includes(consulta)
    || String(item.id).padStart(2, '0').includes(consulta)
  )
}

export function Lista({ tipo, busqueda }: { tipo: Tipo, busqueda?: string }) {
  const { items, loading, error } = useDatos(tipo)
  const { Card, cargando, vacio } = CONFIG[tipo]

  if (loading) return <p className='text-body-md text-center'>{cargando}</p>
  if (error) return <p className='text-body-md text-center'>{error}</p>

  const filtrados = filtrar(items, busqueda)

  if (filtrados.length === 0) {
    return busqueda && busqueda.trim()
      ? <p className='text-body-md text-center'>{SIN_RESULTADOS[tipo]} para «{busqueda.trim()}»</p>
      : <p className='text-body-md text-center'>{vacio}</p>
  }

  return (
    <ul className={s.list}>
      {filtrados.map(item => (
        <li key={item.id}>
          <Card item={item} />
        </li>
      ))}
    </ul>
  )
}
