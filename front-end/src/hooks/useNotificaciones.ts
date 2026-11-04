import { useSyncExternalStore } from 'react'
import { obtenerNotificaciones, suscribirse } from '../realtime/notificaciones'

// Lee el store de notificaciones (src/realtime/notificaciones.ts) y se
// re-renderiza cuando cambia. `obtenerNotificaciones` devuelve siempre
// la misma referencia salvo que haya una mutación (snapshot estable).
export function useNotificaciones() {
    return useSyncExternalStore(suscribirse, obtenerNotificaciones, obtenerNotificaciones)
}
