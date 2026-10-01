import { z } from 'zod'

export const loginSchema = z.object({
    email: z.string().trim().min(1,'Ingresá tu correo electrónico').email('El correo no es válido'),
    password: z.string().min(1,'Ingresa tu contaseña').min(6,'La contraseña debe tener al menos 6 caracteres')
})

export const registerSchema = z.object({
    nombre: z.string().trim().min(1, "Ingresá un nombre"),
    rol_id: z.coerce.number().positive('Seleccioná un rol'),
    email: z.string().trim().min(1,'Ingresá tu correo electrónico').email('El correo no es válido'),
    password: z.string().min(1,'Ingresá tu contraseña').min(6, 'La contraseña debe tener al menos 6 caracteres')
})