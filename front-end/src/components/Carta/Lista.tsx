import type { ReactNode } from 'react'
import type { ItemLista, Tipo } from '../../hooks/useDatos'
import type { Categoria, Ingrediente, PlatoListar, Promocion } from '../../types/Menu'
import type { Reserva } from '../../types/Reserva'
import type { Mesa } from '../../types/Mesa'
import type { Usuario } from '../../types/Auth'
import { PlatoCard } from '../Platos/PlatoCard'
import { IngredienteCard } from '../Ingredientes/IngredienteCard'
import { CategoriaCard } from '../Categorias/CategoriaCard'
import { UsuarioCard } from '../Usuarios/UsuarioCard'
import { PromocionCard } from '../Promociones/PromocionCard'
import { ReservaCard } from '../Reservas/ReservaCard'
import { MesaCard } from '../Mesas/MesaCard'
import s from './Lista.module.css'

type Config = {
  Card: (props: { item: ItemLista; onCambio?: () => void }) => ReactNode
  cargando: string
  vacio: string
}

const CONFIG: Record<Tipo, Config> = {
  plato: {
    Card: ({ item, onCambio }) => <PlatoCard plato={item as PlatoListar} onCambio={onCambio} />,
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
  usuario: {
    Card: ({ item }) => <UsuarioCard usuario={item as Usuario} />,
    cargando: 'Cargando usuarios...',
    vacio: 'No hay usuarios cargados todavía',
  },
  promocion: {
    Card: ({ item }) => <PromocionCard promocion={item as Promocion} />,
    cargando: 'Cargando promociones...',
    vacio: 'No hay promociones cargadas todavía',
  },
  reserva: {
    Card: ({ item }) => <ReservaCard reserva={item as Reserva} />,
    cargando: 'Cargando reservas...',
    vacio: 'No hay reservas cargadas todavía',
  },
  mesa: {
    Card: ({ item }) => <MesaCard mesa={item as Mesa} />,
    cargando: 'Cargando mesas...',
    vacio: 'No hay mesas cargadas todavía',
  },
}

const SIN_RESULTADOS: Record<Tipo, string> = {
  plato: 'No se encontraron platos',
  ingrediente: 'No se encontraron ingredientes',
  categoria: 'No se encontraron categorías',
  usuario: 'No se encontraron usuarios',
  promocion: 'No se encontraron promociones',
  reserva: 'No se encontraron reservas',
  mesa: 'No se encontraron mesas',
}

// La lista llega ya filtrada por chips (hub): si el filtro dejó todo
// afuera, no es "no hay nada cargado".
const SIN_FILTRO: Record<Tipo, string> = {
  plato: 'No se encontraron platos con el filtro aplicado',
  ingrediente: 'No se encontraron ingredientes con el filtro aplicado',
  categoria: 'No se encontraron categorías con el filtro aplicado',
  usuario: 'No se encontraron usuarios con el filtro aplicado',
  promocion: 'No se encontraron promociones con el filtro aplicado',
  reserva: 'No se encontraron reservas con el filtro aplicado',
  mesa: 'No se encontraron mesas con el filtro aplicado',
}

// Minúsculas + sin acentos: "huevo" encuentra "Huevo Frito".
// No se exporta: react-refresh/only-export-components (ver PlatoCard.formatearPrecio).
const normalizar = (texto: string): string =>
  texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

// La unión es mixta: cada item se busca por los campos que tiene
// (Reserva no tiene `nombre`; se busca por contacto, estado y mesa).
function filtrar(items: ItemLista[], busqueda?: string): ItemLista[] {
  const consulta = normalizar((busqueda ?? '').trim().replace(/^#/, ''))
  if (!consulta) return items

  return items.filter(item =>
    ('nombre' in item && normalizar(item.nombre).includes(consulta))
    || ('contacto_solicitante' in item && normalizar(item.contacto_solicitante).includes(consulta))
    || ('estado' in item && typeof item.estado === 'string' && normalizar(item.estado).includes(consulta))
    || ('mesa' in item && item.mesa != null && normalizar(`mesa ${item.mesa.id}`).includes(consulta))
    || String(item.id).includes(consulta)
    || String(item.id).padStart(2, '0').includes(consulta)
    // Los usuarios también se buscan por email y nombre de rol.
    || ('email' in item && normalizar(String(item.email)).includes(consulta))
    || ('rol' in item && item.rol && normalizar(item.rol.nombre).includes(consulta))
  )
}

type ListaProps = {
  tipo: Tipo
  items: ItemLista[]
  loading: boolean
  error: string | null
  busqueda?: string
  // Cantidad antes de aplicar los chips de filtro (para distinguir
  // "filtro sin resultados" de "no hay nada cargado").
  total?: number
  // Se pasa a las cards que lo usan (PlatoCard) para refrescar la lista.
  onItemCambiado?: () => void
}

export function Lista({ tipo, items, loading, error, busqueda, total, onItemCambiado }: ListaProps) {
  const { Card, cargando, vacio } = CONFIG[tipo]

  if (loading) return <p className='text-body-md text-center'>{cargando}</p>
  if (error) return <p className='text-body-md text-center'>{error}</p>

  const filtrados = filtrar(items, busqueda)

  if (filtrados.length === 0) {
    if (busqueda && busqueda.trim()) {
      return <p className='text-body-md text-center'>{SIN_RESULTADOS[tipo]} para «{busqueda.trim()}»</p>
    }
    if (total !== undefined && total > 0) {
      return <p className='text-body-md text-center'>{SIN_FILTRO[tipo]}</p>
    }
    return <p className='text-body-md text-center'>{vacio}</p>
  }

  return (
    <ul className={s.list}>
      {filtrados.map(item => (
        <li key={item.id}>
          <Card item={item} onCambio={onItemCambiado} />
        </li>
      ))}
    </ul>
  )
}
