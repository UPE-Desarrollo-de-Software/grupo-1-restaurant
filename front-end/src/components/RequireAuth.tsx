import type { ReactNode } from "react";
import { getToken, getUsuario } from "../api/auth";
import { Navigate } from "react-router-dom";


export function RequireAuth({children, rolesPermitidos}: {children:ReactNode, rolesPermitidos?: number[]}){
    const usuario = getUsuario()

    if(!getToken() || !usuario) return <Navigate to="/login" replace/>
    if(rolesPermitidos && !rolesPermitidos.includes(usuario.rol_id)) return <Navigate to="/menu" replace/>

    return children
}