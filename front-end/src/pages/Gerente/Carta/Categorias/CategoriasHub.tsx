import { useState } from 'react'
import { BotonRedireccion } from "../../../../components/Carta/BotonRedireccion";
import { Buscador } from "../../../../components/Carta/Buscador";
import { Lista } from "../../../../components/Carta/Lista";
import { Resumen } from "../../../../components/Carta/Resumen";
import { FiltroEstadoCategorias } from '../../../../components/Categorias/FiltroEstadoCategorias';
import { aplicarFiltroEstadoCategorias } from '../../../../components/Categorias/filtroCategorias';
import type { FiltroEstadoCategoria } from '../../../../components/Categorias/filtroCategorias';
import { useDatos } from '../../../../hooks/useDatos';
import type { Categoria } from '../../../../types/Menu';
import s from './Platos.module.css'

export function CategoriasPage() {
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<FiltroEstadoCategoria>('todas')
  const { items, loading, error } = useDatos('categoria')

  const categorias = items as Categoria[]
  const categoriasFiltradas = aplicarFiltroEstadoCategorias(categorias, filtro)

  return (
    <div className={`${s.page} ${s.hub}`}>
      <Buscador placeHolder='Buscar categoría por nombre...' valor={busqueda} onCambio={setBusqueda}/>
      <BotonRedireccion nombre='Nueva categoria' ruta='/gerente/carta/categorias/crear'/>
      <Resumen tipo='categoria' items={items} loading={loading} />
      <FiltroEstadoCategorias categorias={categorias} filtro={filtro} onFiltro={setFiltro} />
      <Lista
        tipo='categoria'
        items={categoriasFiltradas}
        total={categorias.length}
        loading={loading}
        error={error}
        busqueda={busqueda}
      />
    </div>
  )
}
