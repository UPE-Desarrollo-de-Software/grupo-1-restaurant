// Mensaje de error legible para la UI. El backend devuelve 401 con
// "Unauthenticated." (inglés) cuando el token es inválido o expiró; se
// traduce a un mensaje accionable para el usuario.
export function mensajeErrorApi(status: number, data: { message?: string } | null, porDefecto: string): string {
  if (status === 401) return 'Sesión expirada o inválida. Volvé a iniciar sesión.'
  return data?.message ?? porDefecto
}
