import { Fragment, useState } from 'react'
import { Button, Modal } from 'react-bootstrap'
import type { Ingrediente } from '../../types/Menu'
import { formatearPrecio } from '../../utils/historial'
import {
    OPCIONES_ESTADO_INGREDIENTE,
    opcionEstadoIngrediente,
    type ConfiguracionIngrediente,
} from '../../utils/ingredientePlato'
import s from './PanelEstadoIngrediente.module.css'

interface PanelEstadoIngredienteProps {
    ingrediente: Ingrediente
    configuracion: ConfiguracionIngrediente
    onGuardar: (configuracion: ConfiguracionIngrediente) => void
    onCerrar: () => void
}

/**
 * Regla de cocina de un ingrediente dentro del plato. Trabaja sobre un
 * borrador: tocar una opción no toca el plato hasta "Guardar y continuar",
 * y "Cancelar"/la X descartan. El componente se monta sólo mientras el
 * panel está abierto (el borrador arranca de cero en cada apertura).
 */
export function PanelEstadoIngrediente({
    ingrediente,
    configuracion,
    onGuardar,
    onCerrar,
}: PanelEstadoIngredienteProps) {
    const [borrador, setBorrador] = useState<ConfiguracionIngrediente>(configuracion)

    const opcionElegida = opcionEstadoIngrediente(borrador.estado)
    const esAgregar = borrador.estado === 'agregar'
    const precio = Number(borrador.precioAdicional)
    const precioValido = borrador.precioAdicional.trim() !== '' && Number.isFinite(precio) && precio >= 0
    const idTitulo = `panel-ingrediente-${ingrediente.id}`

    return (
        <Modal
            show={true}
            onHide={onCerrar}
            centered={true}
            backdropClassName={s.backdrop}
            dialogClassName={s.dialogo}
            contentClassName={s.contenido}
            aria-labelledby={idTitulo}
        >
            <Modal.Header className={s.cabecera} closeButton={true} closeLabel='Cerrar'>
                <span className={s.identidad}>
                    <span className={s.avatar} data-tono={opcionElegida.tono} aria-hidden='true'>
                        <i className={`bi ${opcionElegida.icono}`} />
                    </span>
                    <span className={s.titulos}>
                        <span className={`text-label-md ${s.etiqueta}`}>Configurar regla de cocina</span>
                        <span className={`text-headline-sm ${s.nombre}`} id={idTitulo}>
                            {ingrediente.nombre}
                        </span>
                    </span>
                </span>
            </Modal.Header>

            <Modal.Body className={s.cuerpo}>
                <p className={`text-body-md ${s.ayuda}`}>
                    Elegí cómo interactúa el cliente con este ingrediente al pedir.
                </p>

                <div className={s.opciones} role='radiogroup' aria-labelledby={idTitulo}>
                    {OPCIONES_ESTADO_INGREDIENTE.map(opcion => {
                        const activa = opcion.valor === borrador.estado

                        return (
                            <Fragment key={opcion.tono}>
                                <label className={s.opcion} data-tono={opcion.tono} data-activa={activa}>
                                    <input
                                        type='radio'
                                        className={s.radioOculto}
                                        name={`panel-estado-${ingrediente.id}`}
                                        value={opcion.valor}
                                        checked={activa}
                                        onChange={() => setBorrador(prev => ({ ...prev, estado: opcion.valor }))}
                                    />
                                    <span className={s.opcionIcono} aria-hidden='true'>
                                        <i className={`bi ${opcion.icono}`} />
                                    </span>
                                    <span className={s.opcionTexto}>
                                        <span className={`text-label-lg ${s.opcionTitulo}`}>{opcion.titulo}</span>
                                        <span className={`text-body-sm ${s.opcionDescripcion}`}>{opcion.descripcion}</span>
                                    </span>
                                    {activa
                                        ? <i className={`bi bi-check-circle-fill ${s.tilde}`} aria-hidden='true' />
                                        : opcion.tag !== '' && (
                                            <span className={`text-label-sm ${s.tag}`}>{opcion.tag}</span>
                                        )}
                                </label>

                                {esAgregar && opcion.valor === 'agregar' && (
                                    <div className={s.precio}>
                                        <label className={s.precioEtiqueta} htmlFor={`precio-ingrediente-${ingrediente.id}`}>
                                            Precio adicional
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
                                                value={borrador.precioAdicional}
                                                onChange={(e) => setBorrador(prev => ({ ...prev, precioAdicional: e.target.value }))}
                                            />
                                        </div>
                                        <span className={`text-body-sm ${s.precioAyuda}`}>
                                            {precioValido
                                                ? `Extra al agregarlo: ${formatearPrecio(precio)}`
                                                : `Vacío hereda el catálogo: ${formatearPrecio(ingrediente.precioAdicional)}`}
                                        </span>
                                    </div>
                                )}
                            </Fragment>
                        )
                    })}
                </div>
            </Modal.Body>

            <Modal.Footer className={s.pie}>
                <Button variant='outline-secondary' type='button' onClick={onCerrar}>
                    Cancelar
                </Button>
                <Button variant='primary' type='button' onClick={() => onGuardar(borrador)}>
                    Guardar y continuar
                </Button>
            </Modal.Footer>
        </Modal>
    )
}
