import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Alert } from 'react-bootstrap'
import { Buscador } from '../../components/Carta/Buscador'
import { BotonRedireccion } from '../../components/Carta/BotonRedireccion'
import { Resumen } from '../../components/Carta/Resumen'
import { Lista } from '../../components/Carta/Lista'
import { useDatos } from '../../hooks/useDatos'
import { usePedidosRealtime } from '../../realtime/useRealtimeEmpleado'
import s from './Mozo.module.css'

// Panel de mesas del mozo: mismo andamiaje que GestionMesas del gerente
// (buscador + toolbar de alta + resumen/lista), pero dando a
// /mozo/mesas/crear (alta de visita) y sin edición de mesas. La lista
// son las visitas en curso: el mozo crea la mesa (nace ocupada) y la
// cierra desde MozoMesa (vista Cuenta) tras el pago (borrado lógico).
export function MozoPage() {
    const [busqueda, setBusqueda] = useState('')
    const { items, loading, error, recargar } = useDatos('mesa')

    // Estado/platos/total de cada visita se mueve con los pedidos: el hub
    // se refresca con cada evento (sin polling) si Reverb está configurado.
    usePedidosRealtime({ alCrear: recargar, alCambiarEstado: recargar, alConectar: recargar })

    // Aviso del cierre de visita (MozoMesa navega acá con location.state).
    const location = useLocation()
    const aviso = (location.state as { aviso?: string } | null)?.aviso

    return (
        <div className={`${s.page} ${s.hub}`}>
            <div className={s.toolbar}>
                <BotonRedireccion nombre='Nueva mesa' ruta='/mozo/mesas/crear' />
            </div>

            <Buscador
                placeHolder='Buscar mesa por id o código...'
                valor={busqueda}
                onCambio={setBusqueda}
            />

            {aviso && <Alert variant='success' className='text-body-md'>{aviso}</Alert>}

            <Resumen tipo='mesa' items={items} loading={loading} variante='compacta' />
            <Lista tipo='mesa' items={items} loading={loading} error={error} busqueda={busqueda} />
        </div>
    )
}
