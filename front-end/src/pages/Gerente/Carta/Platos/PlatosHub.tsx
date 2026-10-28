import { useState } from 'react'
import { Buscador } from '../../../../components/Carta/Buscador'
import { BotonRedireccion } from '../../../../components/Carta/BotonRedireccion'
import { Resumen } from '../../../../components/Carta/Resumen'
import { FiltroCategorias } from '../../../../components/Platos/FiltroCategorias'
import { aplicarFiltroPlatos } from '../../../../components/Platos/filtroPlatos'
import type { FiltroCategoriaPlatos, FiltroEstadoPlatos } from '../../../../components/Platos/filtroPlatos'
import { Lista } from '../../../../components/Carta/Lista'
import { useDatos } from '../../../../hooks/useDatos'
import type { Categoria, PlatoListar } from '../../../../types/Menu'
import s from './Platos.module.css'

export function PlatosHubPage() {
  const [busqueda, setBusqueda] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState<FiltroCategoriaPlatos>('todas')
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstadoPlatos>('todos')
  const { items, loading, error, recargar } = useDatos('plato')
  // Las categorías activas alimentan el select del filtro.
  const { items: itemsCategorias } = useDatos('categoria')

  const platos = items as PlatoListar[]
  const categorias = itemsCategorias as Categoria[]
  const platosFiltrados = aplicarFiltroPlatos(platos, filtroCategoria, filtroEstado)

  return (
    <div className={`${s.page} ${s.hub}`}>
      <Buscador
        placeHolder='Buscar plato por nombre o id...'
        valor={busqueda}
        onCambio={setBusqueda}
      />
      <BotonRedireccion nombre='Nuevo Plato' ruta='/gerente/carta/platos/crear'/>
      <Resumen tipo='plato' items={items} loading={loading} />
      <FiltroCategorias
        platos={platos}
        categorias={categorias}
        filtroCategoria={filtroCategoria}
        filtroEstado={filtroEstado}
        onFiltroCategoria={setFiltroCategoria}
        onFiltroEstado={setFiltroEstado}
      />
      <Lista
        tipo='plato'
        items={platosFiltrados}
        total={platos.length}
        loading={loading}
        error={error}
        busqueda={busqueda}
        onItemCambiado={recargar}
      />
    </div>
  )
}
