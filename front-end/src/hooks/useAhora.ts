import { useEffect, useState } from 'react'

// Reloj compartido para el "hace X min" de las comandas. El setState
// ocurre dentro del callback del intervalo (no en el body del efecto),
// respetando la regla set-state-in-effect.
export function useAhora(intervaloMs = 30_000): Date {
    const [ahora, setAhora] = useState(() => new Date())

    useEffect(() => {
        const id = window.setInterval(() => setAhora(new Date()), intervaloMs)
        return () => window.clearInterval(id)
    }, [intervaloMs])

    return ahora
}
