/**
 * Ruta de inicio (panel principal) de cada rol staff. La usan el Login
 * (tras iniciar sesión) y el Navbar (al clickear el logo). El rol viene del
 * backend en el login (`usuario.rol.nombre`); no hay fallback por ids.
 */
export const INICIO_POR_ROL: Record<string, string> = {
    Gerente: '/gerente',
    Cocina: '/cocina',
    Mozo: '/mozo',
}
