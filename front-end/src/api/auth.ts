import { API_BASE_URL } from "../config/env";
import type { LoginInput, RegisterInput } from "../schemas/auth";

interface LoginResponse{
    message: string,
    usuario: {id: number; nombre: string, email: string; rol_id: number},
    token: string
}


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

interface RegisterResponse{
    message: string,
    usuario: {id: number; nombre: string, email: string; rol_id: number},
}

export async function register(credenciales: RegisterInput, signal?: AbortSignal): Promise<RegisterResponse> {
    const response = await fetch(`${API_BASE_URL}/usuarios`,{
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": `Bearer ${localStorage.getItem('token')}`},
        body: JSON.stringify(credenciales),
        signal
    })

    const data = await response.json().catch(()=>null)

    if(!response.ok){
        throw new Error(data?.message ?? `Error ${response.status} al registrar usuario`)
    }
    return data as RegisterResponse
}