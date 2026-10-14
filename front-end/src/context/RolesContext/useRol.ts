import { getUsuario } from "../../api/auth"
import { useRoles } from "./useRoles"

export function useRol() {
    const { roles, loading } = useRoles()
    const usuario = getUsuario()
    const nombreRol = roles.find(r => r.id === usuario?.rol_id)?.nombre
    return { nombreRol, esGerente: nombreRol === 'Gerente', loading, usuario }
}