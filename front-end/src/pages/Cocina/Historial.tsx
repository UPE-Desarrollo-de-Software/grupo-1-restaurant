import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Alert, Button, ButtonGroup, Form, Spinner } from 'react-bootstrap'
import { DetalleComandaHistorial } from '../../components/Cocina/DetalleComandaHistorial'
import { EstadoComanda } from '../../components/Cocina/EstadoComanda'
import GastroLoader from '../../components/GastroLoader/GastroLoader'
import { useBusquedaComandaHistorial } from '../../hooks/useBusquedaComandaHistorial'
import { useHistorialComandas } from '../../hooks/useHistorialComandas'
import type { ComandaHistorial } from '../../types/Historial'
import {
    contarProductosHistorial,
    etiquetaMesaHistorial,
    fechaLocal,
    formatearFechaHora,
    formatearPrecio,
    mesLocal,
    rangoDelDia,
    rangoDelMes,
} from '../../utils/historial'
import s from './Historial.module.css'

const TAMANO_PAGINA = 20

// Historial de comandas de cocina. El listado muestra comandas
// finalizadas (cerrado/cancelado) del día o mes elegido; la búsqueda por
// número usa GET /historial/comandas/{id}, ignora el período y admite
// cualquier estado.
export function HistorialCocinaPage() {
    const [modo, setModo] = useState<'dia' | 'mes'>('dia')
    const [dia, setDia] = useState(() => fechaLocal())
    const [mes, setMes] = useState(() => mesLocal())
    const [paginaActual, setPaginaActual] = useState(1)
    const [seleccionadaId, setSeleccionadaId] = useState<number | null>(null)
    const [numero, setNumero] = useState('')
    const [errorNumero, setErrorNumero] = useState<string | null>(null)
    const [idBuscado, setIdBuscado] = useState<number | null>(null)
    const [actualizando, setActualizando] = useState(false)

    const rango = useMemo(() => {
        const calculado = modo === 'dia' ? rangoDelDia(dia) : rangoDelMes(mes)
        if (calculado) return calculado
        const hoy = fechaLocal()
        return { desde: hoy, hasta: hoy }
    }, [modo, dia, mes])

    const {
        pagina,
        error,
        cargando,
        reintentar,
    } = useHistorialComandas({
        desde: rango.desde,
        hasta: rango.hasta,
        page: paginaActual,
        perPage: TAMANO_PAGINA,
    })

    const {
        comanda: comandaExacta,
        error: errorBusqueda,
        buscando,
        buscar,
        limpiar,
    } = useBusquedaComandaHistorial()

    const comandas = pagina?.data ?? []
    const seleccionada = comandas.find(comanda => comanda.id === seleccionadaId) ?? comandas[0] ?? null
    const enBusqueda = idBuscado !== null
    const detalle = enBusqueda ? comandaExacta : seleccionada
    const cargandoDetalle = enBusqueda ? buscando : cargando
    const errorDetalle = enBusqueda ? errorBusqueda : error
    const total = pagina?.total ?? 0
    const ocupado = actualizando || cargando || buscando

    function limpiarBusqueda() {
        setIdBuscado(null)
        setNumero('')
        setErrorNumero(null)
        limpiar()
    }

    function cambiarModo(nuevo: 'dia' | 'mes') {
        if (nuevo === modo) return
        if (nuevo === 'mes') {
            const mesDelDia = dia.slice(0, 7)
            if (rangoDelMes(mesDelDia)) setMes(mesDelDia)
        } else {
            const primerDiaDelMes = `${mes}-01`
            if (rangoDelDia(primerDiaDelMes)) setDia(primerDiaDelMes)
        }
        setModo(nuevo)
        setPaginaActual(1)
        setSeleccionadaId(null)
        limpiarBusqueda()
    }

    function cambiarDia(valor: string) {
        if (!valor) return
        setDia(valor)
        setPaginaActual(1)
        setSeleccionadaId(null)
        limpiarBusqueda()
    }

    function cambiarMes(valor: string) {
        if (!valor) return
        setMes(valor)
        setPaginaActual(1)
        setSeleccionadaId(null)
        limpiarBusqueda()
    }

    function irAHoy() {
        setModo('dia')
        setDia(fechaLocal())
        setMes(mesLocal())
        setPaginaActual(1)
        setSeleccionadaId(null)
        limpiarBusqueda()
    }

    function buscarComanda(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const id = Number(numero.trim())
        if (!Number.isInteger(id) || id <= 0) {
            setErrorNumero('Ingresá un número de comanda válido.')
            return
        }
        setErrorNumero(null)
        setIdBuscado(id)
        setSeleccionadaId(null)
        void buscar(id)
    }

    function reintentarBusqueda() {
        if (idBuscado === null) return
        void buscar(idBuscado)
    }

    async function reintentarLista() {
        setActualizando(true)
        try {
            await reintentar()
        } finally {
            setActualizando(false)
        }
    }

    function irAPagina(nueva: number) {
        setPaginaActual(nueva)
        setSeleccionadaId(null)
    }

    return (
        <div className={s.page}>
            <header className={s.encabezado}>
                <div>
                    <h1 className={`text-headline-lg ${s.titulo}`}>Historial</h1>
                    <p className={`text-body-md ${s.subtitulo}`}>
                        Comandas finalizadas por día o mes. También podés buscar una comanda por número.
                    </p>
                </div>
            </header>

            <section className={s.filtros} aria-label='Filtros del historial'>
                <div className={s.filtroGrupo}>
                    <span className={`text-label-sm ${s.filtroEtiqueta}`}>Período</span>
                    <ButtonGroup size='sm' aria-label='Elegir período'>
                        <Button
                            variant={modo === 'dia' ? 'primary' : 'outline-primary'}
                            className='text-label-md'
                            type='button'
                            aria-pressed={modo === 'dia'}
                            onClick={() => cambiarModo('dia')}
                        >
                            Día
                        </Button>
                        <Button
                            variant={modo === 'mes' ? 'primary' : 'outline-primary'}
                            className='text-label-md'
                            type='button'
                            aria-pressed={modo === 'mes'}
                            onClick={() => cambiarModo('mes')}
                        >
                            Mes
                        </Button>
                    </ButtonGroup>
                    {modo === 'dia' ? (
                        <Form.Control
                            type='date'
                            value={dia}
                            onChange={event => cambiarDia(event.target.value)}
                            aria-label='Día del historial'
                            className={s.fechaInput}
                        />
                    ) : (
                        <Form.Control
                            type='month'
                            value={mes}
                            onChange={event => cambiarMes(event.target.value)}
                            aria-label='Mes del historial'
                            className={s.fechaInput}
                        />
                    )}
                    <Button
                        size='sm'
                        variant='outline-secondary'
                        className='text-label-md'
                        type='button'
                        onClick={irAHoy}
                    >
                        <i className='bi bi-calendar-event me-1' aria-hidden='true' />
                        Hoy
                    </Button>
                </div>

                <Form className={s.busqueda} onSubmit={buscarComanda}>
                    <Form.Label className='visually-hidden' htmlFor='buscar-comanda'>
                        Buscar número de comanda
                    </Form.Label>
                    <Form.Control
                        id='buscar-comanda'
                        type='number'
                        min={1}
                        step={1}
                        inputMode='numeric'
                        placeholder='Buscar Nº de comanda'
                        value={numero}
                        onChange={event => {
                            setNumero(event.target.value)
                            setErrorNumero(null)
                        }}
                        className={s.busquedaInput}
                    />
                    <Button
                        type='submit'
                        size='sm'
                        variant='primary'
                        className='text-label-md'
                        disabled={buscando}
                    >
                        {buscando
                            ? <Spinner size='sm' animation='border' />
                            : <i className='bi bi-search' aria-hidden='true' />}
                        <span className='ms-1'>Buscar</span>
                    </Button>
                </Form>
            </section>

            {errorNumero && (
                <Alert variant='warning' className='text-body-sm mb-0'>
                    {errorNumero}
                </Alert>
            )}

            <div className={s.paneles}>
                <section className={s.listaPanel} aria-label='Resultados del historial'>
                    <div className={s.panelCabecera}>
                        <h2 className={`text-headline-sm ${s.panelTitulo}`}>
                            {enBusqueda ? `Resultado #${idBuscado}` : 'Comandas'}
                        </h2>
                        {enBusqueda ? (
                            <Button
                                variant='link'
                                size='sm'
                                className='text-label-sm p-0'
                                type='button'
                                onClick={limpiarBusqueda}
                            >
                                Limpiar búsqueda
                            </Button>
                        ) : (
                            <span className={`text-label-sm ${s.contador}`}>
                                {cargando ? 'Cargando…' : `${total} ${total === 1 ? 'comanda' : 'comandas'}`}
                            </span>
                        )}
                    </div>

                    {enBusqueda && (
                        <p className={`text-body-sm ${s.aviso}`}>
                            La búsqueda por número ignora el período seleccionado.
                        </p>
                    )}

                    {enBusqueda ? (
                        buscando ? (
                            <div className={s.centro}>
                                <GastroLoader messages={['Buscando comanda…']} size={80} />
                            </div>
                        ) : errorBusqueda ? (
                            <Alert variant='danger' className='text-body-sm mb-0'>
                                {errorBusqueda}
                                <div className={s.accionesError}>
                                    <Button size='sm' variant='outline-danger' type='button' onClick={reintentarBusqueda}>
                                        Reintentar
                                    </Button>
                                    <Button size='sm' variant='outline-secondary' type='button' onClick={limpiarBusqueda}>
                                        Limpiar
                                    </Button>
                                </div>
                            </Alert>
                        ) : comandaExacta ? (
                            <ul className={s.lista}>
                                <ItemComandaHistorial
                                    comanda={comandaExacta}
                                    activa
                                    onSelect={() => setSeleccionadaId(comandaExacta.id)}
                                />
                            </ul>
                        ) : (
                            <p className={s.vacio}>No se encontró la comanda #{idBuscado}.</p>
                        )
                    ) : cargando ? (
                        <div className={s.centro}>
                            <GastroLoader messages={['Cargando historial…']} size={80} />
                        </div>
                    ) : error ? (
                        <Alert variant='danger' className='text-body-sm mb-0'>
                            {error}
                            <div className={s.accionesError}>
                                <Button
                                    size='sm'
                                    variant='outline-danger'
                                    type='button'
                                    disabled={actualizando}
                                    onClick={() => { void reintentarLista() }}
                                >
                                    Reintentar
                                </Button>
                            </div>
                        </Alert>
                    ) : comandas.length === 0 ? (
                        <div className={s.vacioEstado}>
                            <i className='bi bi-clock-history' aria-hidden='true' />
                            <p className='text-body-md mb-0'>No hay comandas finalizadas en el período.</p>
                        </div>
                    ) : (
                        <>
                            <ul className={s.lista}>
                                {comandas.map(comanda => (
                                    <ItemComandaHistorial
                                        key={comanda.id}
                                        comanda={comanda}
                                        activa={seleccionada?.id === comanda.id}
                                        onSelect={() => setSeleccionadaId(comanda.id)}
                                    />
                                ))}
                            </ul>
                            {pagina && pagina.last_page > 1 && (
                                <div className={s.paginacion}>
                                    <span className={`text-body-sm ${s.paginacionTexto}`}>
                                        {pagina.from ?? 0}–{pagina.to ?? 0} de {pagina.total}
                                    </span>
                                    <div className={s.paginacionBotones}>
                                        <Button
                                            size='sm'
                                            variant='outline-secondary'
                                            type='button'
                                            disabled={pagina.current_page <= 1 || ocupado}
                                            onClick={() => irAPagina(pagina.current_page - 1)}
                                            aria-label='Página anterior'
                                        >
                                            <i className='bi bi-chevron-left' aria-hidden='true' />
                                        </Button>
                                        <span className={`text-label-sm ${s.paginaActual}`}>
                                            {pagina.current_page} / {pagina.last_page}
                                        </span>
                                        <Button
                                            size='sm'
                                            variant='outline-secondary'
                                            type='button'
                                            disabled={pagina.current_page >= pagina.last_page || ocupado}
                                            onClick={() => irAPagina(pagina.current_page + 1)}
                                            aria-label='Página siguiente'
                                        >
                                            <i className='bi bi-chevron-right' aria-hidden='true' />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </section>

                <section className={s.detallePanel} aria-label='Detalle de la comanda'>
                    {cargandoDetalle ? (
                        <PanelVacio cargando />
                    ) : errorDetalle ? (
                        <PanelVacio
                            icono='bi-exclamation-triangle'
                            mensaje={enBusqueda ? 'No se pudo cargar la comanda.' : 'No se pudo cargar el historial.'}
                        />
                    ) : detalle ? (
                        <DetalleComandaHistorial comanda={detalle} />
                    ) : (
                        <PanelVacio
                            mensaje={enBusqueda
                                ? 'No hay una comanda para mostrar.'
                                : 'No hay comandas para mostrar en el período.'}
                        />
                    )}
                </section>
            </div>
        </div>
    )
}

function ItemComandaHistorial({
    comanda,
    activa,
    onSelect,
}: {
    comanda: ComandaHistorial
    activa: boolean
    onSelect: () => void
}) {
    const productos = contarProductosHistorial(comanda)

    return (
        <li>
            <button
                type='button'
                className={activa ? `${s.item} ${s.itemActivo}` : s.item}
                aria-pressed={activa}
                onClick={onSelect}
            >
                <span className={s.itemCuerpo}>
                    <span className={s.itemFila}>
                        <span className={`text-headline-sm ${s.itemTitulo}`}>Pedido #{comanda.id}</span>
                        <EstadoComanda estado={comanda.estado} />
                    </span>
                    <span className={`text-body-sm ${s.itemMeta}`}>
                        <i className='bi bi-shop me-1' aria-hidden='true' />
                        {etiquetaMesaHistorial(comanda.mesa)}
                    </span>
                    <span className={`text-body-sm ${s.itemMeta}`}>
                        <i className='bi bi-calendar3 me-1' aria-hidden='true' />
                        {formatearFechaHora(comanda.fecha)}
                    </span>
                    <span className={`text-body-sm ${s.itemProductos}`}>
                        <i className='bi bi-basket me-1' aria-hidden='true' />
                        {productos} {productos === 1 ? 'producto' : 'productos'}
                        <span className={`text-label-md ${s.itemTotal}`}>
                            {formatearPrecio(comanda.total)}
                        </span>
                    </span>
                </span>
            </button>
        </li>
    )
}

function PanelVacio({
    cargando = false,
    mensaje,
    icono = 'bi-clock-history',
}: {
    cargando?: boolean
    mensaje?: string
    icono?: string
}) {
    return (
        <div className={s.panelVacio}>
            {cargando ? (
                <GastroLoader messages={[]} size={72} />
            ) : (
                <i className={`bi ${icono}`} aria-hidden='true' />
            )}
            {mensaje && <p className='text-body-md mb-0'>{mensaje}</p>}
        </div>
    )
}
