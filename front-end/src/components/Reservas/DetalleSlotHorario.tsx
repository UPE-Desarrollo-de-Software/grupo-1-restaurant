import type { SlotDisponibilidad } from '../../types/Reserva'
import s from './DetalleSlotHorario.module.css'

// Detalle del turno elegido: aforo libre y combinaciones de capacidades
// que el backend puede asignar. Sólo lectura.
export function DetalleSlotHorario({ slot }: { slot: SlotDisponibilidad | null }) {
    if (!slot) return null

    return (
        <div className={`text-body-sm ${s.detalleSlot}`}>
            <span className='d-block'>
                Aforo libre para las {slot.hora}:{' '}
                <strong>{slot.aforo_disponible} personas</strong>
            </span>
            {slot.disponible.length > 0 ? (
                <ul className='mb-0 ps-3'>
                    {slot.disponible.map(fila => (
                        <li key={fila.capacidad}>
                            Combinaciones de {fila.capacidad} lugares × {fila.cantidad}
                        </li>
                    ))}
                </ul>
            ) : (
                <span className='d-block'>
                    No quedan combinaciones libres para ese horario; probá
                    con otro.
                </span>
            )}
        </div>
    )
}
