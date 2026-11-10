import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Button, Form } from 'react-bootstrap'
import { Buscador } from '../../../components/Carta/Buscador'
import { BotonRedireccion } from '../../../components/Carta/BotonRedireccion'
import { Resumen } from '../../../components/Carta/Resumen'
import { Lista } from '../../../components/Carta/Lista'
import { useDatos } from '../../../hooks/useDatos'
import { useReservasRealtime } from '../../../realtime/useRealtimeEmpleado'
import { baseReservas } from '../../../navigation/rutas'
import type { EstadoReserva, Reserva } from '../../../types/Reserva'
import s from './Reservas.module.css'

const ESTADOS: { value: EstadoReserva | ''; label: string }[] = [
    { value: '', label: 'Todos los estados' },
    { value: 'pendiente', label: 'Pendientes' },
    { value: 'cancelada', label: 'Canceladas' },
    { value: 'finalizada', label: 'Finalizadas' },
    { value: 'no_asistio', label: 'No asistió' },
]

export function ReservasHubPage() {
    const [busqueda, setBusqueda] = useState('')
    const [estado, setEstado] = useState<EstadoReserva | ''>('')
    const [fecha, setFecha] = useState('')
    const { items, loading, error, recargar } = useDatos('reserva')
    // Se sirve bajo /gerente/reservas (Gerente) y /mozo/reservas (Mozo).
    const base = baseReservas(useLocation().pathname)

    // Tiempo real: altas, cancelaciones, llegadas e inasistencias
    // (propia o de otros usuarios) refrescan el listado.
    useReservasRealtime({
        alCrear: recargar,
        alCancelar: recargar,
        alCambiarEstado: recargar,
        alConectar: recargar,
    })

    const reservas = items.filter((item): item is Reserva => 'contacto_solicitante' in item)
    const filtradas = reservas.filter(r =>
        (!estado || r.estado === estado) && (!fecha || r.fecha === fecha)
    )

    return (
        <div className={`${s.page} ${s.hub}`}>
            <h1 className={`text-headline-md ${s.title}`}>Reservas</h1>
            <Buscador
                placeHolder='Buscar por nombre o código...'
                valor={busqueda}
                onCambio={setBusqueda}
            />
            <BotonRedireccion nombre='Nueva Reserva' ruta={`${base}/crear`}/>
            <Resumen tipo='reserva' items={items} loading={loading} />
            <div className={s.filtros}>
                <Form.Select
                    className={`${s.filtro} text-label-md`}
                    value={estado}
                    onChange={(e) => setEstado(e.target.value as EstadoReserva | '')}
                    aria-label='Filtrar por estado'
                >
                    {ESTADOS.map(opcion => (
                        <option value={opcion.value} key={opcion.label}>{opcion.label}</option>
                    ))}
                </Form.Select>
                <Form.Control
                    className={`${s.filtro}  text-label-md`}
                    type='date'
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    aria-label='Filtrar por fecha'
                />
                {(estado || fecha) && (
                    <Button
                        variant='outline-secondary'
                        size='sm'
                        className='text-label-md'
                        type='button'
                        onClick={() => { setEstado(''); setFecha('') }}
                    >
                        <i className='bi bi-x-lg me-1' aria-hidden='true' />
                        Limpiar
                    </Button>
                )}
            </div>
            <Lista tipo='reserva' items={filtradas} loading={loading} error={error} busqueda={busqueda} />
        </div>
    )
}
