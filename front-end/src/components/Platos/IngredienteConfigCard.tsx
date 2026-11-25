import { useState } from 'react'
import type { Ingrediente } from '../../types/Menu'
import { formatearPrecio } from '../../utils/historial'
import { opcionEstadoIngrediente, type ConfiguracionIngrediente } from '../../utils/ingredientePlato'
import { PanelEstadoIngrediente } from './PanelEstadoIngrediente'
import s from './ConfiguradorIngredientes.module.css'

interface IngredienteConfigCardProps {
    ingrediente: Ingrediente
    configuracion: ConfiguracionIngrediente
    onCambiar: (configuracion: ConfiguracionIngrediente) => void
}

/**
 * Ingrediente dentro del plato: ícono y nombre a la izquierda, botón con el
 * estado actual a la derecha. El botón abre el panel emergente, que es el
 * único lugar donde se cambia la regla (acá no se duplica esa lógica).
 */
export function IngredienteConfigCard({
    ingrediente,
    configuracion,
    onCambiar,
}: IngredienteConfigCardProps) {
    const [panelAbierto, setPanelAbierto] = useState(false)

    const opcion = opcionEstadoIngrediente(configuracion.estado)
    const precio = Number(configuracion.precioAdicional)
    const precioValido = configuracion.precioAdicional.trim() !== '' && Number.isFinite(precio) && precio >= 0
    // El recargo sólo se muestra en "Para agregar": hereda el catálogo si el
    // campo quedó vacío (mismo criterio del payload).
    const recargo = configuracion.estado === 'agregar'
        ? (precioValido ? precio : ingrediente.precioAdicional)
        : null

    return (
        <li className={s.card} data-tono={opcion.tono}>
            <div className={s.cuerpoCard}>
                <span className={s.iconoCard} data-tono={opcion.tono} aria-hidden='true'>
                    <i className={`bi ${opcion.icono}`} />
                </span>

                <span className={s.textoCard}>
                    <span className={s.nombre}>
                        <span className={s.nombreTexto}>{ingrediente.nombre}</span>
                        {recargo !== null && (
                            <span className={s.recargo}>+{formatearPrecio(recargo)}</span>
                        )}
                    </span>
                    <span className={`text-body-sm ${s.subtitulo}`}>{opcion.resumen}</span>
                </span>

                <button
                    type='button'
                    className={s.botonEstado}
                    data-tono={opcion.tono}
                    aria-haspopup='dialog'
                    aria-label={`${ingrediente.nombre}: ${opcion.etiqueta}. Cambiar estado`}
                    onClick={() => setPanelAbierto(true)}
                >
                    <i className={`bi ${opcion.icono}`} aria-hidden='true' />
                    {opcion.etiqueta}
                    <i className={`bi bi-chevron-down ${s.caret}`} aria-hidden='true' />
                </button>
            </div>

            {panelAbierto && (
                <PanelEstadoIngrediente
                    ingrediente={ingrediente}
                    configuracion={configuracion}
                    onGuardar={(nueva) => {
                        onCambiar(nueva)
                        setPanelAbierto(false)
                    }}
                    onCerrar={() => setPanelAbierto(false)}
                />
            )}
        </li>
    )
}
