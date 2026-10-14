const HORARIOS_POR_DIA: Record<number, string[]> = {
  0: ['12:30', '13:00', '13:30', '20:00', '20:30'],
  1: [],
  2: ['12:00', '12:30', '13:00', '20:00', '20:30', '21:00'],
  3: ['12:00', '12:30', '13:00', '13:30', '20:00', '21:00'],
  4: ['12:00', '12:30', '13:00', '20:00', '20:30', '21:00', '21:30'],
  5: ['12:30', '13:00', '13:30', '20:00', '20:30', '21:00', '21:30', '22:00'],
  6: ['12:00', '12:30', '13:00', '13:30', '20:00', '20:30', '21:00', '21:30'],
}

export function obtenerHorariosDisponibles(fecha: string): string[] {
  if (!fecha) return []

  const [anio, mes, dia] = fecha.split('-').map(Number)
  const fechaSeleccionada = new Date(anio, mes - 1, dia)
  const horarios = HORARIOS_POR_DIA[fechaSeleccionada.getDay()] ?? []

  if (fecha !== obtenerFechaLocal(new Date())) return horarios

  const horaActual = new Date().getHours() * 60 + new Date().getMinutes()
  return horarios.filter((horario) => {
    const [hora, minutos] = horario.split(':').map(Number)
    return hora * 60 + minutos > horaActual
  })
}

export function obtenerFechaLocal(fecha: Date): string {
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}
