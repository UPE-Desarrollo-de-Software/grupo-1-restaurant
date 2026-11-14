import { jsPDF } from 'jspdf'
import logo from '../assets/logo/gastroapp-logo-256x256.png'
import { PALETA, canales, cargarImagen } from './descargas'

// Comprobante PDF de la reserva (A5 vertical, formato ticket) con la
// estética de GastroApp: banda terracota con el logo, tarjeta blanca
// con el PIN como protagonista, filas de datos y caja sage con la
// pre-orden. El QR apunta a /preorden para que el cliente edite su
// pre-orden con el PIN.

export interface ComprobanteReserva {
    /** PIN de 4 dígitos (clave de la reserva para el cliente). */
    pin: string
    /** 'Y-m-d' (tal cual la manda el backend). */
    fecha: string
    /** 'HH:mm'. */
    hora: string
    cantPersonas: number
    contacto: string
    /** Cantidad de platos en la pre-orden (0 = sin pre-orden). */
    cantidadPreorden: number
    /** QR ya renderizado (canvas oculto de la página); null si falla. */
    qrDataUrl: string | null
    /** window.location.origin, para el pie. */
    origen: string
}

function textoFecha(fecha: string): string {
    const fechaDate = new Date(`${fecha}T00:00:00`)
    if (Number.isNaN(fechaDate.getTime())) return fecha
    return fechaDate.toLocaleDateString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    })
}

export async function descargarComprobanteReserva(datos: ComprobanteReserva): Promise<void> {
    const doc = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'portrait' })

    const color = (hex: string) => {
        const [r, g, b] = canales(hex)
        doc.setTextColor(r, g, b)
    }
    const relleno = (hex: string) => {
        const [r, g, b] = canales(hex)
        doc.setFillColor(r, g, b)
    }
    const trazo = (hex: string) => {
        const [r, g, b] = canales(hex)
        doc.setDrawColor(r, g, b)
    }

    // Fondo general (tono cerámico, nunca blanco puro).
    relleno(PALETA.fondo)
    doc.rect(0, 0, 148, 210, 'F')

    // ---- Banda de cabecera ----
    relleno(PALETA.primario)
    doc.rect(0, 0, 148, 56, 'F')
    // Filo sage: el segundo color de la casa.
    relleno(PALETA.secundario)
    doc.rect(0, 56, 148, 1.4, 'F')

    // Logo en badge blanco (si no carga, sigue el resto del PDF).
    try {
        const imagenLogo = await cargarImagen(logo)
        relleno(PALETA.tarjeta)
        doc.circle(24, 28, 11, 'F')
        doc.addImage(imagenLogo, 'PNG', 16, 20, 16, 16)
    } catch {
        // Sin logo el comprobante sigue siendo válido.
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setCharSpace(0.8)
    color('#f2c8b8')
    doc.text('GastroApp', 40, 24)
    doc.setCharSpace(0)
    doc.setFontSize(17)
    color(PALETA.tarjeta)
    doc.text('Reserva confirmada', 40, 40)

    // ---- Tarjeta de datos ----
    relleno(PALETA.tarjeta)
    trazo(PALETA.borde)
    doc.setLineWidth(0.3)
    doc.roundedRect(10, 66, 128, 130, 4, 4, 'FD')

    // Etiqueta + PIN (el protagonista del ticket).
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setCharSpace(0.6)
    color(PALETA.textoSecundario)
    doc.text('CÓDIGO DE RESERVA · PIN', 16, 84)
    doc.setCharSpace(0)
    doc.setFontSize(34)
    color(PALETA.primario)
    doc.text(datos.pin, 16, 110)

    // QR a la derecha (edita la pre-orden con el PIN).
    if (datos.qrDataUrl) {
        relleno(PALETA.bloque)
        trazo(PALETA.borde)
        doc.roundedRect(96, 76, 36, 36, 3, 3, 'FD')
        doc.addImage(datos.qrDataUrl, 'PNG', 99, 79, 30, 30)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6.5)
        color(PALETA.textoSecundario)
        doc.text('Modificá tu pre-orden', 114, 118, { align: 'center' })
        doc.text('con tu PIN', 114, 123, { align: 'center' })
    }

    // Filas de datos.
    doc.setDrawColor(...canales(PALETA.borde))
    doc.setLineWidth(0.2)
    doc.line(16, 132, 132, 132)

    const fila = (etiqueta: string, valor: string, y: number) => {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8.5)
        color(PALETA.textoSecundario)
        doc.text(etiqueta, 16, y)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9.5)
        color(PALETA.texto)
        doc.text(valor, 132, y, { align: 'right' })
    }

    fila('Fecha', textoFecha(datos.fecha), 142)
    fila('Hora', `${datos.hora} hs`, 154)
    fila('Personas', String(datos.cantPersonas), 166)

    // Pre-orden (caja sage) si la hay.
    if (datos.cantidadPreorden > 0) {
        relleno(PALETA.secundarioContainer)
        doc.roundedRect(16, 176, 116, 14, 2, 2, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        color(PALETA.onSecundarioContainer)
        const etiqueta = `Tu pre-orden: ${datos.cantidadPreorden} ${
            datos.cantidadPreorden === 1 ? 'plato' : 'platos'
        } - se envía solo a cocina al llegar.`
        doc.text(etiqueta, 74, 184.5, { align: 'center' })
    }

    // ---- Pie ----
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    color(PALETA.textoSecundario)
    const pie = datos.contacto !== ''
        ? `${datos.contacto} · Presentá este comprobante al mozo al llegar.`
        : 'Presentá este comprobante al mozo al llegar.'
    doc.text(pie, 74, 203, { align: 'center' })
    doc.setFontSize(6.5)
    color(PALETA.textoTerciario)
    doc.text(datos.origen.replace(/^https?:\/\//, ''), 74, 208, { align: 'center' })

    doc.save(`comprobante-reserva-${datos.pin}.pdf`)
}
