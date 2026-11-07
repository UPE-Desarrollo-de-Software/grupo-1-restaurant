export const API_BASE_URL = import.meta.env.VITE_API_URL;

const numero = (valor: string | undefined, porDefecto: number): number => {
    const parseado = Number(valor)
    return Number.isFinite(parseado) ? parseado : porDefecto
}

// Conexión Reverb (WebSockets). En desarrollo el servidor corre en
// ws://localhost:8080; en producción el .env define host/puerto/scheme
// (REVERB_SCHEME=https → wss). Sin VITE_REVERB_APP_KEY no hay forma de
// firmar los canales privados: la capa realtime queda desactivada y las
// pantallas siguen funcionando con su refresco manual.
export const REVERB = {
    key: import.meta.env.VITE_REVERB_APP_KEY ?? '',
    host: import.meta.env.VITE_REVERB_HOST ?? 'localhost',
    port: numero(import.meta.env.VITE_REVERB_PORT, 8080),
    scheme: import.meta.env.VITE_REVERB_SCHEME ?? 'http',
    activo: Boolean(import.meta.env.VITE_REVERB_APP_KEY),
}
