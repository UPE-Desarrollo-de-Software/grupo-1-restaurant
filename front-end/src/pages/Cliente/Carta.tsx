import { useState } from 'react'
import { Buscador } from '../../components/Carta/Buscador'
import { FiltroCategorias } from '../../components/Platos/FiltroCategorias'
import { aplicarFiltroPlatos } from '../../components/Platos/filtroPlatos'
import type { FiltroCategoriaPlatos } from '../../components/Platos/filtroPlatos'
import { MenuList } from '../../components/Menu/MenuList'
import { usePlatos } from '../../hooks/usePlatos'
import { useCategorias } from '../../hooks/useCategorias'
import { normalizarTexto } from '../../utils/busqueda'
import s from './Carta.module.css'

// Carta pública del cliente: buscador por nombre/descripción + filtro por
// categoría sobre los platos de GET /platos. Ese endpoint sólo devuelve
// platos disponibles, así que el filtro de estado del panel del gerente
// no aplica acá (queda fijo en 'todos').
export function CartaPage() {
  const [busqueda, setBusqueda] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState<FiltroCategoriaPlatos>('todas')
  const { platos, loading, error } = usePlatos()
  const { categorias } = useCategorias()

  const consulta = normalizarTexto(busqueda.trim())
  const platosFiltrados = aplicarFiltroPlatos(platos, filtroCategoria, 'todos')
    .filter(plato =>
      !consulta ||
      normalizarTexto(plato.nombre).includes(consulta) ||
      normalizarTexto(plato.descripcion ?? '').includes(consulta)
    )

  return (
    <div className={s.page}>
      <Buscador
        placeHolder='Buscar plato por nombre o descripción...'
        valor={busqueda}
        onCambio={setBusqueda}
      />
      <FiltroCategorias
        platos={platos}
        categorias={categorias}
        filtroCategoria={filtroCategoria}
        filtroEstado='todos'
        onFiltroCategoria={setFiltroCategoria}
        onFiltroEstado={() => {}}
        mostrarEstado={false}
      />
      <MenuList
        platos={platosFiltrados}
        loading={loading}
        error={error}
        busqueda={busqueda}
      />
    </div>
  )
}
