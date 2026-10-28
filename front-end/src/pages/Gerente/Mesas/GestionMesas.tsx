import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Alert } from 'react-bootstrap'
import { Buscador } from '../../../components/Carta/Buscador'
import { BotonRedireccion } from '../../../components/Carta/BotonRedireccion'
import { Resumen } from '../../../components/Carta/Resumen'
import { Lista } from '../../../components/Carta/Lista'
import { useDatos } from '../../../hooks/useDatos'
import s from './Mesas.module.css'

export function GestionMesasPage() {
  const [busqueda, setBusqueda] = useState('')
  const { items, loading, error } = useDatos('mesa')

  // Aviso del cierre de visita (EditarMesa navega acá con location.state).
  const location = useLocation()
  const aviso = (location.state as { aviso?: string } | null)?.aviso

  return (
    <div className={`${s.page} ${s.hub}`}>
      <Buscador
        placeHolder='Buscar mesa por id...'
        valor={busqueda}
        onCambio={setBusqueda}
      />

      <div className={s.toolbar}>
        <BotonRedireccion nombre='Nueva mesa' ruta='/gerente/mesas/gestion/crear' />
      </div>

      {aviso && <Alert variant='success' className='text-body-md'>{aviso}</Alert>}

      <Resumen tipo='mesa' items={items} loading={loading} />
      <Lista tipo='mesa' items={items} loading={loading} error={error} busqueda={busqueda} />
    </div>
  )
}
