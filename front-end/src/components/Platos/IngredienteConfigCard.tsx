import type { Ingrediente } from '../../types/Menu'
import { etiquetaBadgeIngrediente, type ConfiguracionIngrediente, type OpcionIngredientePlato } from '../../utils/ingredientePlato'
import { formatearPrecio } from '../../utils/historial'
import { SelectorEstadoIngrediente } from './SelectorEstadoIngrediente'
import s from './ConfiguradorIngredientes.module.css'

interface IngredienteConfigCardProps {
    ingrediente: Ingrediente
    configuracion: ConfiguracionIngrediente
    onCambiarEstado: (estado: OpcionIngredientePlato) => void
    onCambiarPrecio: (precio: string) => void
}

export function IngredienteConfigCard({
    ingrediente,
    configuracion,
    onCambiarEstado,
    onCambiarPrecio,
}: IngredienteConfigCardProps) {
    const estado = configuracion.estado || 'excluido'
    const esOpcional = configuracion.estado === 'agregar'
    const precio = Number(configuracion.precioAdicional)
    const precioValido = configuracion.precioAdicional.trim() !== '' && Number.isFinite(precio) && precio >= 0

    return (
        <li className={s.card} data-estado={estado}>
            <div className={s.cabecera}>
                <span className={s.nombre}>{ingrediente.nombre}</span>
                <span className={s.badge} data-estado={estado}>
                    {etiquetaBadgeIngrediente(configuracion.estado)}
                </span>
            </div>

            <SelectorEstadoIngrediente
                ingredienteId={ingrediente.id}
                nombre={ingrediente.nombre}
                valor={configuracion.estado}
                onChange={onCambiarEstado}
            />

            {esOpcional && (
                <div className={s.precio}>
                    <label className={s.precioEtiqueta} htmlFor={`precio-ingrediente-${ingrediente.id}`}>
                        Recargo al agregar
                    </label>
                    <div className={s.precioCampo}>
                        <span className={s.precioSimbolo} aria-hidden='true'>$</span>
                        <input
                            id={`precio-ingrediente-${ingrediente.id}`}
                            className={s.precioInput}
                            type='number'
                            min={0}
                            step={0.01}
                            inputMode='decimal'
                            value={configuracion.precioAdicional}
                            onChange={(e) => onCambiarPrecio(e.target.value)}
                        />
                    </div>
                    {precioValido ? (
                        <span className={s.precioVista}>{formatearPrecio(precio)}</span>
                    ) : (
                        <span className={s.precioHereda}>
                            Hereda el catálogo: {formatearPrecio(ingrediente.precioAdicional)}
                        </span>
                    )}
                </div>
            )}
        </li>
    )
}