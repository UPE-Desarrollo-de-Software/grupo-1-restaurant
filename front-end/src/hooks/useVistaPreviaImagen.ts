import { useEffect, useMemo } from 'react'

// URL de objeto para previsualizar el archivo elegido antes de subirlo.
// Se revoca al cambiar de archivo (o al desmontar) para no filtrar memoria.
export function useVistaPreviaImagen(archivo: File | null): string | null {
    const url = useMemo(() => (archivo ? URL.createObjectURL(archivo) : null), [archivo])

    useEffect(() => {
        if (!url) return
        return () => URL.revokeObjectURL(url)
    }, [url])

    return url
}
