import { useState } from 'react'
import { Accordion } from 'react-bootstrap'
import type { Ingrediente } from '../../types/Menu'
import { normalizarTexto } from '../../utils/busqueda'
import type { ConfiguracionIngrediente, OpcionIngredientePlato } from '../../utils/ingredientePlato'
import { IngredienteConfigCard } from './IngredienteConfigCard'
import s from './ConfiguradorIngredientes.module.css'

interface ConfiguradorIngredientesProps {
    ingredientes: Ingrediente[]
    cargando: boolean
    configuracion: Record<number, ConfiguracionIngrediente>
    onCambiar: (id: number, configuracion: ConfiguracionIngrediente) => void
}

/**
 * Listado completo del catálogo dentro de un acordeón: cada ingrediente
 * define cómo participa en el plato y, si es Opcional, con qué recargo.
 * El buscador filtra por nombre (sin acentos ni mayúsculas).
 */
export function ConfiguradorIngredientes({
    ingredientes,
    cargando,
    configuracion,
    onCambiar,
}: ConfiguradorIngredientesProps) {
    const [busqueda, setBusqueda] = useState('')
    const consulta = normalizarTexto(busqueda.trim())
    const visibles = consulta === ''
        ? ingredientes
        : ingredientes.filter(ingrediente => normalizarTexto(ingrediente.nombre).includes(consulta))
    const incluidas = Object.values(configuracion).filter(conf => conf.estado !== '').length

    // Sin configurar todavía: excluido, con el recargo de catálogo listo
    // para cuando el usuario elija Opcional.
    const configuracionDe = (ingrediente: Ingrediente): ConfiguracionIngrediente =>
        configuracion[ingrediente.id] ?? {
            estado: '',
            precioAdicional: String(ingrediente.precioAdicional),
        }

    const cambiarEstado = (ingrediente: Ingrediente, estado: OpcionIngredientePlato) =>
        onCambiar(ingrediente.id, { ...configuracionDe(ingrediente), estado })

    return (
        <Accordion defaultActiveKey='0' className={s.acordeon}>
            <Accordion.Item eventKey='0'>
                <Accordion.Header>
                    <span className={s.resumen}>
                        Ingredientes de la receta
                        <span className={s.contador} title={`${incluidas} ingredientes en el plato`}>
                            {incluidas}
                        </span>
                    </span>
                </Accordion.Header>
                <Accordion.Body>
                    <div className={s.buscador}>
                        <i className={`bi bi-search ${s.buscadorIcono}`} aria-hidden='true' />
                        <input
                            className={s.buscadorInput}
                            type='search'
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder='Buscar ingrediente'
                            aria-label='Buscar ingrediente'
                        />
                    </div>

                    {cargando ? (
                        <p className={`text-body-sm ${s.vacio}`}>Cargando ingredientes...</p>
                    ) : ingredientes.length === 0 ? (
                        <p className={`text-body-sm ${s.vacio}`}>
                            No hay ingredientes cargados. Creá uno desde Carta &gt; Ingredientes.
                        </p>
                    ) : visibles.length === 0 ? (
                        <p className={`text-body-sm ${s.vacio}`}>Ningún ingrediente coincide con la búsqueda.</p>
                    ) : (
                        <ul className={s.listado}>
                            {visibles.map(ingrediente => {
                                const conf = configuracionDe(ingrediente)

                                return (
                                    <IngredienteConfigCard
                                        key={ingrediente.id}
                                        ingrediente={ingrediente}
                                        configuracion={conf}
                                        onCambiarEstado={(estado) => cambiarEstado(ingrediente, estado)}
                                        onCambiarPrecio={(precioAdicional) => onCambiar(ingrediente.id, { ...conf, precioAdicional })}
                                    />
                                )
                            })}
                        </ul>
                    )}
                </Accordion.Body>
            </Accordion.Item>
        </Accordion>
    )
}