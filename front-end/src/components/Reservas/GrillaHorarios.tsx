import type { SlotDisponibilidad } from '../../types/Reserva'
import { motivoDeshabilitado, type ContextoSlot } from '../../utils/horariosReserva'
import s from './GrillaHorarios.module.css'

interface GrillaHorariosProps {
    slots: SlotDisponibilidad[]
    // Hora elegida ('HH:MM'), vacía si todavía no se eligió.
    seleccionada: string
    contexto: ContextoSlot
    onSeleccionar: (hora: string) => void
}

// Grilla de turnos compartida por los tres flujos de alta de reserva
// (cliente, gerente y mozo). Los turnos y la anticipación los define el
// backend (DisponibilidadReservaService); acá sólo se marca cuáles no se
// pueden elegir (anticipación, cantidad de personas o aforo insuficiente).
export function GrillaHorarios({ slots, seleccionada, contexto, onSeleccionar }: GrillaHorariosProps) {
    return (
        <div className={s.grilla} role='group' aria-label='Horarios disponibles'>
            {slots.map(slot => {
                const motivo = motivoDeshabilitado(slot, contexto)
                const seleccionado = slot.hora === seleccionada && motivo === null
                return (
                    <button
                        key={slot.hora}
                        type='button'
                        className={s.slot}
                        aria-pressed={seleccionado}
                        disabled={motivo !== null}
                        title={motivo ?? undefined}
                        onClick={() => onSeleccionar(slot.hora)}
                    >
                        {slot.hora}
                    </button>
                )
            })}
        </div>
    )
}
