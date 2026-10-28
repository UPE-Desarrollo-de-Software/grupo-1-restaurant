import { getUsuario } from "../../api/auth"

export function useRol() {
    const usuario = getUsuario()
    const nombreRol = usuario?.rol?.nombre
    return { nombreRol, esGerente: nombreRol === 'Gerente', loading: false, usuario }
}
