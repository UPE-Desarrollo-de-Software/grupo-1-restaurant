import { createContext, useContext } from "react"
import type { Rol } from "../../types/Auth";

interface RolesCtx {
    roles: Rol[],
    loading: boolean,
    error: string | null
}

export const ROLES_FALLBACK: Rol[] = [
    { id: 1, nombre: 'Gerente' },
    { id: 2, nombre: 'Cocina' },
    { id: 3, nombre: 'Mozo' },
]

export const RolesContext = createContext<RolesCtx| null>(null)

export function useRoles(){
    const ctx = useContext(RolesContext)
    if (!ctx) throw new Error('useRoles debe usarse dentro de <RolesProvider>')
    return ctx
}