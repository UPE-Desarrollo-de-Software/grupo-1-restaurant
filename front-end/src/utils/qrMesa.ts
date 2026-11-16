// ==== QR de la visita de una mesa ====
// El QR codifica `${origin}/mesa?codigo={codigo_acceso}`: al escanearlo,
// `/mesa` valida el PIN sola y deja al cliente identificado. El código es
// la credencial y muere con la visita (borrado lógico al cerrar la mesa).
// El origin se resuelve en runtime: el mismo afiche sirve en local y en prod.

/** URL que codifica el QR de la mesa. */
export function destinoQrMesa(codigo: string): string {
    return `${window.location.origin}/mesa?codigo=${codigo}`
}

/** "Mesa #02": el número con dos dígitos, igual en la UI y en el afiche. */
export function tituloMesa(id: number): string {
    return `Mesa #${String(id).padStart(2, '0')}`
}
