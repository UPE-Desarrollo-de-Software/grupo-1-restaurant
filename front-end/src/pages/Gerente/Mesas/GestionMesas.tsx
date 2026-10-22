import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Alert, Button } from 'react-bootstrap'
import { Buscador } from '../../../components/Carta/Buscador'
import { BotonRedireccion } from '../../../components/Carta/BotonRedireccion'
import { Resumen } from '../../../components/Carta/Resumen'
import { Lista } from '../../../components/Carta/Lista'
import { OcuparMesaModal } from '../../../components/Mesas/OcuparMesaModal'
import { GrupoMesaModal } from '../../../components/Mesas/GrupoMesaModal'
import { useDatos } from '../../../hooks/useDatos'
import type { Mesa } from '../../../types/Mesa'
import s from './Mesas.module.css'

export function GestionMesasPage() {
  const [busqueda, setBusqueda] = useState('')
  const [modalOcupar, setModalOcupar] = useState(false)
  const [modalGrupo, setModalGrupo] = useState<'agrupar' | 'desagrupar' | null>(null)
  const { items, loading, error, recargar } = useDatos('mesa')

  // Aviso del borrado (EditarMesa navega acá con location.state).
  const location = useLocation()
  const aviso = (location.state as { aviso?: string } | null)?.aviso

  const mesas = items as Mesa[]
  const hayParaOcupar = mesas.some(mesa => mesa.estado !== 'ocupada')
  const hayParaAgrupar =
    mesas.filter(mesa => mesa.estado === 'ocupada' && mesa.grupo_codigo == null).length >= 2
  const hayGrupos = mesas.some(mesa => mesa.grupo_codigo != null)

  return (
    <div className={`${s.page} ${s.hub}`}>
      <Buscador
        placeHolder='Buscar mesa por id o estado...'
        valor={busqueda}
        onCambio={setBusqueda}
      />

      <div className={s.toolbar}>
        <BotonRedireccion nombre='Nueva mesa' ruta='/gerente/mesas/gestion/crear' />
        <div className={s.accionesGrupo}>
          <Button
            size='sm'
            variant='outline-primary'
            className='text-label-md'
            disabled={!hayParaOcupar || loading}
            title={!hayParaOcupar ? 'No hay mesas libres ni reservadas para ocupar' : undefined}
            onClick={() => setModalOcupar(true)}
          >
            <i className='bi bi-box-arrow-in-right me-1' aria-hidden='true' />
            Ocupar mesa
          </Button>
          <Button
            size='sm'
            variant='outline-primary'
            className='text-label-md'
            disabled={!hayParaAgrupar || loading}
            title={!hayParaAgrupar ? 'Se necesitan al menos 2 mesas ocupadas sin grupo' : undefined}
            onClick={() => setModalGrupo('agrupar')}
          >
            <i className='bi bi-collection me-1' aria-hidden='true' />
            Agrupar mesas
          </Button>
          <Button
            size='sm'
            variant='outline-primary'
            className='text-label-md'
            disabled={!hayGrupos || loading}
            title={!hayGrupos ? 'No hay grupos de mesas activos' : undefined}
            onClick={() => setModalGrupo('desagrupar')}
          >
            <i className='bi bi-layout-split me-1' aria-hidden='true' />
            Desagrupar
          </Button>
        </div>
      </div>

      {aviso && <Alert variant='success' className='text-body-md'>{aviso}</Alert>}

      <Resumen tipo='mesa' items={items} loading={loading} />
      <Lista tipo='mesa' items={items} loading={loading} error={error} busqueda={busqueda} />

      <OcuparMesaModal
        visible={modalOcupar}
        mesas={mesas}
        onCerrar={() => setModalOcupar(false)}
        onCambio={recargar}
      />
      {modalGrupo !== null && (
        <GrupoMesaModal
          visible={true}
          modo={modalGrupo}
          mesas={mesas}
          onCerrar={() => setModalGrupo(null)}
          onCambio={recargar}
        />
      )}
    </div>
  )
}
