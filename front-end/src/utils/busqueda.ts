// Normalización compartida de las búsquedas (lista del panel y carta del
// cliente): minúsculas + sin acentos, así "huevo" encuentra "Huevo Frito".
export function normalizarTexto(texto: string): string {
    return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

// ¿El campo contiene la consulta? La consulta llega ya normalizada.
export function coincideTexto(texto: string, consulta: string): boolean {
    return normalizarTexto(texto).includes(consulta)
}
