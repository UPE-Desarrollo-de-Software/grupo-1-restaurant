// ==== Archivos que descarga el usuario ====
// Todo lo que se puede bajar (afiches PNG del QR y comprobante PDF,
// ver `comprobanteReserva.ts`) se dibuja con los tokens de GastroApp
// ("Terracotta & Sage"): mismos colores y misma tipografía que la app,
// para que el archivo se vea parte del producto y no un PDF/imagen
// genérica.

export const PALETA = {
    fondo: '#fbf8fb',
    tarjeta: '#ffffff',
    bloque: '#f6f3f5',
    borde: '#dec0b7',
    texto: '#1b1b1d',
    textoSecundario: '#57423b',
    textoTerciario: '#8a726a',
    primario: '#9f3c16',
    primarioContainer: '#bf542c',
    secundario: '#4c6450',
    secundarioContainer: '#ceead0',
    onSecundarioContainer: '#526a56',
} as const

// La app la carga en index.html (Google Fonts, 400/600/700); en canvas
// hay que esperar `document.fonts.ready` antes de medir o dibujar.
export const FUENTE_APP = '"Plus Jakarta Sans", sans-serif'

/** Hex `#rrggbb` → canales 0-255 (para jsPDF y canvas). */
export function canales(hex: string): [number, number, number] {
    const limpio = hex.replace('#', '')
    return [
        parseInt(limpio.slice(0, 2), 16),
        parseInt(limpio.slice(2, 4), 16),
        parseInt(limpio.slice(4, 6), 16),
    ]
}

/** Carga una imagen estática (logo) ya decodificada, lista para drawImage/addImage. */
export async function cargarImagen(src: string): Promise<HTMLImageElement> {
    const imagen = new Image()
    imagen.src = src
    await imagen.decode()
    return imagen
}

/** Espera a que la tipografía de la app esté disponible para canvas. */
export async function esperarTipografia(): Promise<void> {
    if (document.fonts) {
        await document.fonts.ready
    }
}

/** Baja un canvas como PNG con nombre sugerido. */
export function descargarImagen(canvas: HTMLCanvasElement, nombreArchivo: string): void {
    const enlace = document.createElement('a')
    enlace.href = canvas.toDataURL('image/png')
    enlace.download = nombreArchivo
    enlace.click()
}

// ==== Afiche PNG con QR ====

export interface AficheQrDatos {
    /** Logo de la app (ya cargado con `cargarImagen`). */
    logo: HTMLImageElement
    /** QR ya generado en alta resolución (el canvas oculto de la página). */
    qr: HTMLCanvasElement | HTMLImageElement
    titulo: string
    subtitulo?: string
    /** URL mostrada debajo del QR (afiche general de la carta). */
    urlDestino?: string
    /** Bloque punteado con un código (p. ej. el PIN de la mesa). */
    codigo?: { etiqueta: string; valor: string }
    pie?: string
}

type ContextoConEspaciado = CanvasRenderingContext2D & { letterSpacing?: string }

function espaciado(ctx: CanvasRenderingContext2D, valor: string): void {
    const conEspaciado = ctx as ContextoConEspaciado
    if ('letterSpacing' in conEspaciado) {
        conEspaciado.letterSpacing = valor
    }
}

function ajustarLineas(ctx: CanvasRenderingContext2D, texto: string, anchoMax: number): string[] {
    const palabras = texto.split(' ')
    const lineas: string[] = []
    let actual = ''
    for (const palabra of palabras) {
        const prueba = actual === '' ? palabra : `${actual} ${palabra}`
        if (ctx.measureText(prueba).width > anchoMax && actual !== '') {
            lineas.push(actual)
            actual = palabra
        } else {
            actual = prueba
        }
    }
    if (actual !== '') lineas.push(actual)
    return lineas
}

function dibujarCentrado(
    ctx: CanvasRenderingContext2D,
    lineas: string[],
    centro: number,
    tope: number,
    interlineado: number,
): number {
    let y = tope
    for (const linea of lineas) {
        ctx.fillText(linea, centro, y)
        y += interlineado
    }
    return y
}

/**
 * Dibuja el afiche del QR (tarjeta con sombra, logo, título, QR en
 * caja, URL opcional y bloque de código punteado) en un canvas listo
 * para descargar. Devuelve el canvas; quien lo llama lo baja con
 * `descargarImagen`.
 */
export async function dibujarAficheQr(datos: AficheQrDatos): Promise<HTMLCanvasElement> {
    await esperarTipografia()

    const ancho = 1080
    const margen = 48
    const relleno = 72
    const util = ancho - margen * 2 - relleno * 2
    const centro = ancho / 2

    // ---- Medición (antes de dimensionar el canvas) ----
    const medicion = document.createElement('canvas').getContext('2d')
    if (!medicion) {
        throw new Error('No se pudo preparar el archivo para descargar.')
    }

    medicion.font = `700 56px ${FUENTE_APP}`
    const lineasTitulo = ajustarLineas(medicion, datos.titulo, util)
    medicion.font = `400 32px ${FUENTE_APP}`
    const lineasSubtitulo = datos.subtitulo
        ? ajustarLineas(medicion, datos.subtitulo, util)
        : []
    medicion.font = `400 28px ${FUENTE_APP}`
    const lineasPie = datos.pie ? ajustarLineas(medicion, datos.pie, util) : []

    // ---- Layout (cursor vertical absoluto) ----
    let y = margen + 40 // espacio arriba de la píldora
    y += 12 // píldora
    y += 56 // píldora → logo
    y += 160 // logo
    y += 48 // logo → título
    y += lineasTitulo.length * 68
    if (lineasSubtitulo.length > 0) {
        y += 16
        y += lineasSubtitulo.length * 42
    }
    y += 56 // → caja del QR
    y += 632 // caja del QR (QR 560 + 36 de padding)
    if (datos.urlDestino) {
        y += 40
        y += 44
    }
    if (datos.codigo) {
        y += 48
        y += 240 // bloque del código
    }
    y += 56 // → pie
    y += lineasPie.length * 42

    const alto = Math.ceil(y + relleno + margen)

    // ---- Dibujo ----
    const lienzo = document.createElement('canvas')
    lienzo.width = ancho
    lienzo.height = alto
    const ctx = lienzo.getContext('2d')
    if (!ctx) {
        throw new Error('No se pudo preparar el archivo para descargar.')
    }

    // Fondo (nunca blanco puro: el tono "cerámica" de la app).
    ctx.fillStyle = PALETA.fondo
    ctx.fillRect(0, 0, ancho, alto)

    // Tarjeta con sombra nivel 2 + borde fino.
    const tarjetaX = margen
    const tarjetaY = margen
    const tarjetaW = ancho - margen * 2
    const tarjetaH = alto - margen * 2
    const caminoTarjeta = () => {
        ctx.beginPath()
        ctx.roundRect(tarjetaX, tarjetaY, tarjetaW, tarjetaH, 40)
    }
    ctx.save()
    ctx.shadowColor = 'rgba(32, 32, 34, 0.12)'
    ctx.shadowBlur = 40
    ctx.shadowOffsetY = 12
    ctx.fillStyle = PALETA.tarjeta
    caminoTarjeta()
    ctx.fill()
    ctx.restore()
    caminoTarjeta()
    ctx.strokeStyle = PALETA.borde
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'

    // Píldora terracota de acento.
    y = tarjetaY + 40
    ctx.fillStyle = PALETA.primario
    ctx.beginPath()
    ctx.roundRect(centro - 70, y, 140, 12, 6)
    ctx.fill()
    y += 12 + 56

    // Logo.
    ctx.drawImage(datos.logo, centro - 80, y, 160, 160)
    y += 160 + 48

    // Título.
    espaciado(ctx, '-0.02em')
    ctx.font = `700 56px ${FUENTE_APP}`
    ctx.fillStyle = PALETA.texto
    y = dibujarCentrado(ctx, lineasTitulo, centro, y, 68)
    espaciado(ctx, '0px')

    // Subtítulo.
    if (lineasSubtitulo.length > 0) {
        y += 16
        ctx.font = `400 32px ${FUENTE_APP}`
        ctx.fillStyle = PALETA.textoSecundario
        y = dibujarCentrado(ctx, lineasSubtitulo, centro, y, 42)
    }

    // Caja del QR (marco en tono bloque, QR blanco encima).
    y += 56
    const cajaQR = 632
    ctx.fillStyle = PALETA.bloque
    ctx.beginPath()
    ctx.roundRect(centro - cajaQR / 2, y, cajaQR, cajaQR, 24)
    ctx.fill()
    ctx.strokeStyle = PALETA.borde
    ctx.lineWidth = 2
    ctx.stroke()
    const tamQR = 560
    ctx.drawImage(datos.qr, centro - tamQR / 2, y + (cajaQR - tamQR) / 2, tamQR, tamQR)
    y += cajaQR

    // URL debajo del QR.
    if (datos.urlDestino) {
        y += 40
        ctx.font = `600 30px ${FUENTE_APP}`
        ctx.fillStyle = PALETA.textoSecundario
        espaciado(ctx, '1.5px')
        ctx.fillText(datos.urlDestino, centro, y + 30)
        espaciado(ctx, '0px')
        y += 44
    }

    // Bloque punteado con el código (PIN).
    if (datos.codigo) {
        y += 48
        const bloqueX = centro - util / 2
        ctx.fillStyle = PALETA.fondo
        ctx.beginPath()
        ctx.roundRect(bloqueX, y, util, 240, 24)
        ctx.fill()
        ctx.setLineDash([16, 12])
        ctx.strokeStyle = PALETA.borde
        ctx.lineWidth = 3
        ctx.stroke()
        ctx.setLineDash([])

        espaciado(ctx, '3px')
        ctx.font = `700 26px ${FUENTE_APP}`
        ctx.fillStyle = PALETA.textoSecundario
        ctx.fillText(datos.codigo.etiqueta.toUpperCase(), centro, y + 74)
        espaciado(ctx, '10px')
        ctx.font = `700 110px ${FUENTE_APP}`
        ctx.fillStyle = PALETA.primario
        ctx.fillText(datos.codigo.valor, centro, y + 194)
        espaciado(ctx, '0px')
        y += 240
    }

    // Pie.
    if (lineasPie.length > 0) {
        y += 56
        ctx.font = `400 28px ${FUENTE_APP}`
        ctx.fillStyle = PALETA.textoSecundario
        dibujarCentrado(ctx, lineasPie, centro, y + 28, 42)
    }

    return lienzo
}
