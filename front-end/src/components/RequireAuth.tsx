import type { ReactNode } from "react";
import { getToken, getUsuario } from "../api/auth";
import { Navigate } from "react-router-dom";
import { useRoles } from "../context/RolesContext/useRoles";

export function RequireAuth({children, rolesPermitidos}: {children:ReactNode, rolesPermitidos?: string[]}){
    const usuario = getUsuario()
    const { roles, loading } = useRoles()

    if(!getToken() || !usuario) return <Navigate to="/login" replace/>

    //roles todavía cargando → NO decido todavía
    if(loading || roles.length === 0) return null

    const rolUsuario = roles.find(r => r.id === usuario.rol_id)?.nombre

    if(rolesPermitidos && !rolesPermitidos.includes(rolUsuario ?? '')) return <Navigate to="/menu" replace/>

    return children
}