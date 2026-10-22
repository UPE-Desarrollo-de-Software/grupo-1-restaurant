import { useState } from 'react'
import { Buscador } from '../../../components/Carta/Buscador'
import { BotonRedireccion } from '../../../components/Carta/BotonRedireccion'
import { Resumen } from '../../../components/Carta/Resumen'
import { Lista } from '../../../components/Carta/Lista'
import { useDatos } from '../../../hooks/useDatos'
import s from './Usuarios.module.css'

export function UsuariosHubPage() {
  const [busqueda, setBusqueda] = useState('')
  const { items, loading, error } = useDatos('usuario')

  return (
    <div className={`${s.page} ${s.hub}`}>
      <Buscador
        placeHolder='Buscar usuario por nombre, email o id...'
        valor={busqueda}
        onCambio={setBusqueda}
      />
      <BotonRedireccion nombre='Nuevo Usuario' ruta='/gerente/usuarios/crear'/>
      <Resumen tipo='usuario' items={items} loading={loading} />
      <Lista tipo='usuario' items={items} loading={loading} error={error} busqueda={busqueda} />
    </div>
  )
}
