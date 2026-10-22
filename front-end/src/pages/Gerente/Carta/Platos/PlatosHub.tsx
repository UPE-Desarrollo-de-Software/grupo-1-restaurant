import { useState } from 'react'
import { Buscador } from '../../../../components/Carta/Buscador'
import { BotonRedireccion } from '../../../../components/Carta/BotonRedireccion'
import { Resumen } from '../../../../components/Carta/Resumen'
import { FiltroCategorias } from '../../../../components/Platos/FiltroCategorias'
import { aplicarFiltroPlatos } from '../../../../components/Platos/filtroPlatos'
import type { FiltroPlatos } from '../../../../components/Platos/filtroPlatos'
import { Lista } from '../../../../components/Carta/Lista'
import { useDatos } from '../../../../hooks/useDatos'
import type { Categoria, PlatoListar } from '../../../../types/Menu'
import s from './Platos.module.css'

export function PlatosHubPage() {
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<FiltroPlatos>('todas')
  const { items, loading, error, recargar } = useDatos('plato')
  // Las categorías activas alimentan los chips del filtro.
  const { items: itemsCategorias } = useDatos('categoria')

  const platos = items as PlatoListar[]
  const categorias = itemsCategorias as Categoria[]
  const platosFiltrados = aplicarFiltroPlatos(platos, filtro)

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
        filtro={filtro}
        onFiltro={setFiltro}
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
