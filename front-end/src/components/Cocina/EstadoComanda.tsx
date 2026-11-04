import type { EstadoPedido } from '../../types/Mesa'
import { etiquetaEstado } from '../../utils/cocina'
import s from './EstadoComanda.module.css'

// Badge de estado de la comanda. En la cola sólo aparecen `enviado` y
// `en_preparacion`; `listo` y el resto de los estados (vista individual e
// historial) usan el color neutro. El texto siempre acompaña al color.
export function EstadoComanda({ estado }: { estado: EstadoPedido }) {
    const clase = estado === 'en_preparacion'
        ? s.preparacion
        : estado === 'listo'
            ? s.listo
            : estado === 'enviado'
                ? s.enviado
                : s.neutro

    return (
        <span className={`text-label-sm ${s.badge} ${clase}`}>
            {etiquetaEstado(estado)}
        </span>
    )
}
