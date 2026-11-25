import { useState } from 'react'
import { Accordion, Form } from 'react-bootstrap'
import type { Ingrediente } from '../../types/Menu'
import { normalizarTexto } from '../../utils/busqueda'
import {
    OPCIONES_ESTADO_INGREDIENTE,
    type ConfiguracionIngrediente,
    type OpcionIngredientePlato,
} from '../../utils/ingredientePlato'
import { IngredienteConfigCard } from './IngredienteConfigCard'
import s from './ConfiguradorIngredientes.module.css'

// 'activos' = sólo lo que entra al plato (obligatorio, por defecto o para agregar).
type FiltroVistaIngredientes = 'activos' | 'todos'
type FiltroEstadoIngredientes = 'todos' | OpcionIngredientePlato

interface ConfiguradorIngredientesProps {
    ingredientes: Ingrediente[]
    cargando: boolean
    configuracion: Record<number, ConfiguracionIngrediente>
    onCambiar: (id: number, configuracion: ConfiguracionIngrediente) => void
    /**
     * Vista inicial del primer select: la edición arranca en 'activos' (sólo lo
     * que ya está en el plato) y el alta en 'todos' (catálogo completo).
     */
    vistaInicial?: FiltroVistaIngredientes
}

/**
 * Listado completo del catálogo dentro de un acordeón: cada ingrediente
 * define cómo participa en el plato y, si es Opcional, con qué recargo.
 * El buscador filtra por nombre (sin acentos ni mayúsculas) y los dos
 * selects acotan el listado por tipo de vista y por estado.
 */
export function ConfiguradorIngredientes({
    ingredientes,
    cargando,
    configuracion,
    onCambiar,
    vistaInicial = 'activos',
}: ConfiguradorIngredientesProps) {
    const [busqueda, setBusqueda] = useState('')
    const [tipoVista, setTipoVista] = useState<FiltroVistaIngredientes>(vistaInicial)
    const [estadoFiltro, setEstadoFiltro] = useState<FiltroEstadoIngredientes>('todos')

    const consulta = normalizarTexto(busqueda.trim())
    const incluidas = Object.values(configuracion).filter(conf => conf.estado !== '').length

    // Sin configurar todavía: excluido, con el recargo de catálogo listo
    // para cuando el usuario elija Opcional.
    const configuracionDe = (ingrediente: Ingrediente): ConfiguracionIngrediente =>
        configuracion[ingrediente.id] ?? {
            estado: '',
            precioAdicional: String(ingrediente.precioAdicional),
        }

    // Los filtros sólo leen la configuración: no la modifican ni reordenan
    // el catálogo original.
    const visibles = ingredientes.filter(ingrediente => {
        const estado = configuracionDe(ingrediente).estado
        if (tipoVista === 'activos' && estado === '') return false
        if (estadoFiltro !== 'todos' && estado !== estadoFiltro) return false
        return consulta === '' || normalizarTexto(ingrediente.nombre).includes(consulta)
    })

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

                    <div className={s.filtros}>
                        <Form.Select
                            className={`${s.select} text-label-md`}
                            value={tipoVista}
                            onChange={e => setTipoVista(e.target.value as FiltroVistaIngredientes)}
                            aria-label='Mostrar ingredientes'
                        >
                            <option value='activos'>Activos</option>
                            <option value='todos'>Todos</option>
                        </Form.Select>

                        <Form.Select
                            className={`${s.select} text-label-md`}
                            value={estadoFiltro}
                            onChange={e => setEstadoFiltro(e.target.value as FiltroEstadoIngredientes)}
                            aria-label='Filtrar por estado'
                        >
                            <option value='todos'>Todos</option>
                            {OPCIONES_ESTADO_INGREDIENTE.map(opcion => (
                                <option key={opcion.tono} value={opcion.valor}>
                                    {opcion.etiqueta}
                                </option>
                            ))}
                        </Form.Select>
                    </div>

                    {cargando ? (
                        <p className={`text-body-sm ${s.vacio}`}>Cargando ingredientes...</p>
                    ) : ingredientes.length === 0 ? (
                        <p className={`text-body-sm ${s.vacio}`}>
                            No hay ingredientes cargados. Creá uno desde Carta &gt; Ingredientes.
                        </p>
                    ) : visibles.length === 0 ? (
                        <p className={`text-body-sm ${s.vacio}`}>
                            {consulta !== ''
                                ? 'Ningún ingrediente coincide con la búsqueda.'
                                : 'Ningún ingrediente coincide con los filtros.'}
                        </p>
                    ) : (
                        <ul className={s.listado}>
                            {visibles.map(ingrediente => {
                                const conf = configuracionDe(ingrediente)

                                return (
                                    <IngredienteConfigCard
                                        key={ingrediente.id}
                                        ingrediente={ingrediente}
                                        configuracion={conf}
                                        onCambiar={(nueva) => onCambiar(ingrediente.id, nueva)}
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
