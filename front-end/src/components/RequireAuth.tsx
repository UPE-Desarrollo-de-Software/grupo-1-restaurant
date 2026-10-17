import type { ReactNode } from "react";
import { getToken, getUsuario } from "../api/auth";
import { Navigate } from "react-router-dom";

export function RequireAuth({children, rolesPermitidos}: {children:ReactNode, rolesPermitidos?: string[]}){
    const usuario = getUsuario()

    if(!getToken() || !usuario) return <Navigate to="/login" replace/>

    // Sesión guardada sin el objeto rol (anterior a este cambio) → re-login
    const rolUsuario = usuario.rol?.nombre
    if(!rolUsuario) return <Navigate to="/login" replace/>

    if(rolesPermitidos && !rolesPermitidos.includes(rolUsuario)) return <Navigate to="/menu" replace/>

    return children
}
