import { API_BASE_URL } from '../config/env'
import { crearEcho, type EchoReverb } from './conexion'

// Identidad del comensal: no hay usuario ni token Sanctum. El Bearer es
// el codigo_acceso de la mesa (el mismo de /cliente/*) y la firma va a
// /api/cliente/broadcasting/auth, que sólo autoriza la propia
// private-mesa.{id}. Si el código cambia (otra visita) o la sesión se
// pierde, la conexión vieja se descarta.
let conexion: EchoReverb | null = null
let codigoActual: string | null = null

export function getEchoCliente(codigo: string): EchoReverb | null {
    if (conexion && codigo === codigoActual) return conexion

    cerrarEchoCliente()
    conexion = crearEcho({
        authEndpoint: `${API_BASE_URL}/cliente/broadcasting/auth`,
        headers: { Authorization: `Bearer ${codigo}`, Accept: 'application/json' },
    })
    codigoActual = conexion ? codigo : null
    return conexion
}

export function cerrarEchoCliente(): void {
    if (conexion) {
        try {
            conexion.disconnect()
        } catch {
            // La conexión ya estaba cerrada: no hay nada que liberar.
        }
    }
    conexion = null
    codigoActual = null
}
