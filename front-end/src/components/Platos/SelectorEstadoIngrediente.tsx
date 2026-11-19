import { OPCIONES_ESTADO_INGREDIENTE, type OpcionIngredientePlato } from '../../utils/ingredientePlato'
import s from './ConfiguradorIngredientes.module.css'

interface SelectorEstadoIngredienteProps {
    ingredienteId: number
    nombre: string
    valor: OpcionIngredientePlato
    onChange: (valor: OpcionIngredientePlato) => void
}

/**
 * Las cuatro opciones como radios reales (ocultos) dentro de <label>: se
 * navegan con teclado y el lector anuncia el grupo, sin perder el look de
 * control segmentado.
 */
export function SelectorEstadoIngrediente({ ingredienteId, nombre, valor, onChange }: SelectorEstadoIngredienteProps) {
    return (
        <div className={s.opciones} role='radiogroup' aria-label={`Cómo participa ${nombre} en el plato`}>
            {OPCIONES_ESTADO_INGREDIENTE.map(opcion => {
                const activa = opcion.valor === valor

                return (
                    <label
                        key={opcion.valor || 'excluido'}
                        className={s.opcion}
                        data-opcion={opcion.valor || 'excluido'}
                        data-activa={activa}
                    >
                        <input
                            type='radio'
                            className={s.radioOculto}
                            name={`estado-ingrediente-${ingredienteId}`}
                            value={opcion.valor}
                            checked={activa}
                            onChange={() => onChange(opcion.valor)}
                        />
                        <i className={`bi ${opcion.icono} ${s.opcionIcono}`} aria-hidden='true' />
                        <span>{opcion.etiqueta}</span>
                    </label>
                )
            })}
        </div>
    )
}