import { getUsuario } from "../../api/auth"
import { useRoles } from "./useRoles"

export function useRol() {
    const { roles, loading } = useRoles()
    const usuario = getUsuario()
    const nombre = roles.find(r => r.id === usuario?.rol_id)?.nombre
    return { nombre, esGerente: nombre === 'Gerente', loading, usuario }
}