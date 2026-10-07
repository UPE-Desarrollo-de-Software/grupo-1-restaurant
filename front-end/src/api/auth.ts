import { API_BASE_URL } from "../config/env";
import type { LoginInput, RegisterInput, Rol, UsuarioSesion } from "../types/Auth";
import type { LoginResponse, RegisterResponse } from "../types/Auth";


export async function login(credenciales: LoginInput, signal?: AbortSignal): Promise<LoginResponse> {
    const response = await fetch( `${API_BASE_URL}/login`,{
        method: 'POST',
        headers: { "Content-Type": "application/json"},
        body: JSON.stringify(credenciales),
        signal
    })

    const data = await response.json().catch(() => null)

    if(!response.ok){
        throw new Error(data?.message ?? `Error ${response.status} al iniciar sesión`)
    }
    return data as LoginResponse
}

export async function register(credenciales: RegisterInput, signal?: AbortSignal): Promise<RegisterResponse> {
    const response = await fetch(`${API_BASE_URL}/usuarios`,{
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": `Bearer ${getToken()}`},
        body: JSON.stringify(credenciales),
        signal
    })

    const data = await response.json().catch(()=>null)

    if(!response.ok){
        throw new Error(data?.message ?? `Error ${response.status} al registrar usuario`)
    }
    return data as RegisterResponse
}

export function setSesion(token: string, usuario: UsuarioSesion){
    localStorage.setItem('token', token)
    localStorage.setItem('usuario', JSON.stringify(usuario))
}

export function getToken() : string | null {
    return localStorage.getItem('token')
}

export function getUsuario():UsuarioSesion | null {
    try {
        const raw = localStorage.getItem('usuario')
        return raw ? JSON.parse(raw) : null
    } catch{
        return null
    }
}

export function logoutLocal(){
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
}

export async function logoutSesion(): Promise<void>{
    try {
        const response = await fetch(`${API_BASE_URL}/logout`,{
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        })

        if(!response.ok) console.warn(`No se pudo invalidar el token: ${response.status}`)
    }finally{
        logoutLocal()
    }
}

export async function getRoles(signal?: AbortSignal):Promise<Rol[]>{
    const response = await fetch(`${API_BASE_URL}/roles`, {signal})
    
    const data =  await response.json().catch(() => null)
    
    if(!response.ok) {
        throw new Error(data?.message ?? `Error ${response.status} al obtener roles`)
    }

    return data as Rol[]
}