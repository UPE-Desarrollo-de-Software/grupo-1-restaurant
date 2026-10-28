import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Alert } from 'react-bootstrap'
import { Buscador } from '../../components/Carta/Buscador'
import { BotonRedireccion } from '../../components/Carta/BotonRedireccion'
import { Resumen } from '../../components/Carta/Resumen'
import { Lista } from '../../components/Carta/Lista'
import { useDatos } from '../../hooks/useDatos'
import s from './Mozo.module.css'

// Panel de mesas del mozo: mismo andamiaje que GestionMesas del gerente
// (buscador + toolbar de alta + resumen/lista), pero dando a
// /mozo/mesas/crear (alta de visita) y sin edición de mesas. La lista
// son las visitas en curso: el mozo crea la mesa (nace ocupada) y la
// cierra desde MozoMesa (vista Cuenta) tras el pago (borrado lógico).
export function MozoPage() {
    const [busqueda, setBusqueda] = useState('')
    const { items, loading, error } = useDatos('mesa')

    // Aviso del cierre de visita (MozoMesa navega acá con location.state).
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
                <BotonRedireccion nombre='Nueva mesa' ruta='/mozo/mesas/crear' />
            </div>

            {aviso && <Alert variant='success' className='text-body-md'>{aviso}</Alert>}

            <Resumen tipo='mesa' items={items} loading={loading} />
            <Lista tipo='mesa' items={items} loading={loading} error={error} busqueda={busqueda} />
        </div>
    )
}
