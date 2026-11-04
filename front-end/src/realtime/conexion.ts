import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import { REVERB } from '../config/env'

// Conexión única a Reverb (Laravel Echo + pusher-js). Cada identidad
// (empleado con token Sanctum / comensal con codigo_acceso) arma su
// propia instancia en empleado.ts y cliente.ts; acá vive lo común.
export type EchoReverb = Echo<'reverb'>

type Identidad = {
    // Endpoint que firma los canales privados: /api/broadcasting/auth
    // (empleado) o /api/cliente/broadcasting/auth (comensal).
    authEndpoint: string
    headers: Record<string, string>
}

export function crearEcho({ authEndpoint, headers }: Identidad): EchoReverb | null {
    if (!REVERB.activo) {
        console.warn('[realtime] Falta VITE_REVERB_APP_KEY: el tiempo real queda desactivado.')
        return null
    }

    try {
        return new Echo<'reverb'>({
            broadcaster: 'reverb',
            key: REVERB.key,
            wsHost: REVERB.host,
            wsPort: REVERB.port,
            wssPort: REVERB.port,
            forceTLS: REVERB.scheme === 'https',
            enabledTransports: ['ws', 'wss'],
            authEndpoint,
            auth: { headers },
            Pusher,
        })
    } catch (error) {
        // Sin Reverb la app sigue funcionando: las pantallas mantienen
        // su refresco manual (botón "Actualizar", recargar tras acción).
        console.warn('[realtime] No se pudo iniciar la conexión en tiempo real.', error)
        return null
    }
}

type Escuchas = Record<string, (datos: never) => void>

// Suscribe los eventos de un canal privado y devuelve la limpieza.
// Los manejadores se envuelven para que el canal quede libre al
// desmontar sin afectar a otras pantallas suscriptas al mismo canal.
// `alConectar` es el catch-up: la pantalla ya carga sus datos al
// montarse, así que acá sólo se recupera lo que pudo perderse durante
// una desconexión (la primera conexión se ignora).
export function suscribir(
    echo: EchoReverb | null,
    canal: string,
    escuchas: Escuchas,
    alConectar?: () => void,
): () => void {
    if (!echo) return () => { }

    try {
        const suscripcion = echo.private(canal)
        const entradas = Object.entries(escuchas) as [string, (datos: unknown) => void][]
        for (const [evento, manejador] of entradas) {
            suscripcion.listen(evento, manejador)
        }

        let primeraConexion = true
        const dejarDeEscuchar = echo.connector.onConnectionChange(estado => {
            if (estado !== 'connected') return
            if (primeraConexion) {
                primeraConexion = false
                return
            }
            alConectar?.()
        })

        return () => {
            dejarDeEscuchar()
            for (const [evento, manejador] of entradas) {
                suscripcion.stopListening(evento, manejador)
            }
        }
    } catch (error) {
        console.warn(`[realtime] No se pudo suscribir al canal ${canal}.`, error)
        return () => { }
    }
}
