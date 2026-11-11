// Reglas de la imagen del plato, espejo del backend
// (POST /platos/{id}/imagen: image|mimes:jpg,jpeg,png,webp|max:2048 KB).
// Validar en el front evita el viaje y muestra el error en español.
export const TIPOS_IMAGEN_PLATO = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

export const MAXIMO_IMAGEN_PLATO = 2 * 1024 * 1024

// Devuelve el mensaje de error o null si el archivo es válido.
export function validarImagenPlato(archivo: File): string | null {
    if (!TIPOS_IMAGEN_PLATO.includes(archivo.type)) {
        return 'La imagen debe ser JPG, PNG o WEBP.'
    }
    if (archivo.size > MAXIMO_IMAGEN_PLATO) {
        return 'La imagen no puede superar los 2 MB.'
    }
    return null
}
