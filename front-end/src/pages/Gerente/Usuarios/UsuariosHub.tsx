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
      <h1 className={`text-headline-md ${s.title}`}>Usuarios</h1>
      <Resumen tipo='usuario' items={items} loading={loading} variante='compacta' />
      <BotonRedireccion nombre='Nuevo Usuario' ruta='/gerente/usuarios/crear'/>
      <Buscador
        placeHolder='Buscar usuario por nombre, email o id...'
        valor={busqueda}
        onCambio={setBusqueda}
      />
      <Lista tipo='usuario' items={items} loading={loading} error={error} busqueda={busqueda} />
    </div>
  )
}
