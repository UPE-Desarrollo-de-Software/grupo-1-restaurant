import { getToken } from '../api/auth'
import { API_BASE_URL } from '../config/env'
import { crearEcho, type EchoReverb } from './conexion'

// Identidad del staff: se conecta con el token Sanctum de la sesión y
// firma los canales empleado.* en /api/broadcasting/auth. Se reutiliza
// una sola conexión por token; al cambiar de usuario (o al hacer
// logout) se descarta la anterior.
let conexion: EchoReverb | null = null
let tokenActual: string | null = null

export function getEchoEmpleado(): EchoReverb | null {
    const token = getToken()
    if (!token) {
        cerrarEchoEmpleado()
        return null
    }
    if (conexion && token === tokenActual) return conexion

    cerrarEchoEmpleado()
    conexion = crearEcho({
        authEndpoint: `${API_BASE_URL}/broadcasting/auth`,
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
    tokenActual = conexion ? token : null
    return conexion
}

export function cerrarEchoEmpleado(): void {
    if (conexion) {
        try {
            conexion.disconnect()
        } catch {
            // La conexión ya estaba cerrada: no hay nada que liberar.
        }
    }
    conexion = null
    tokenActual = null
}
