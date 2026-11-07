import {z} from 'zod'
import type { loginSchema,registerSchema, usuarioEditSchema } from '../schemas/usuarios';

export interface UsuarioSesion {
    id: number,
    nombre: string,
    email: string,
    rol_id: number,
    rol?: Rol
}

// Usuario empleado del ABM (GET/POST/PUT /usuarios...). `activo` es la
// baja lógica del backend (cast boolean).
export interface Usuario {
    id: number,
    nombre: string,
    email: string,
    rol_id: number,
    activo: boolean,
    rol: Rol
}

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type UsuarioInput = RegisterInput
export type UsuarioEditInput = z.infer<typeof usuarioEditSchema>

export interface LoginResponse{
    message: string,
    usuario: UsuarioSesion,
    token: string
}
export type RegisterResponse = Omit<LoginResponse, 'token'>

export interface Rol{
    id: number,
    nombre: string
}