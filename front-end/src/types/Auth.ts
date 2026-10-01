import {z} from 'zod'
import type { loginSchema,registerSchema } from '../schemas/auth';

export interface UsuarioSesion {
    id: number,
    nombre: string,
    email: string,
    rol_id: number
}

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>

export interface LoginResponse{
    message: string,
    usuario: UsuarioSesion,
    token: string
}
export type RegisterResponse = Omit<LoginResponse, 'token'>