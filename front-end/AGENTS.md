# GastroApp frontend (frontPrueba)

Vite + React 19 + TypeScript SPA. React Router 7, Bootstrap 5 + react-bootstrap + bootstrap-icons. Todos los textos del contenido, componentes y mensajes de error están en español.

## Proyecto

GastroApp es un sistema de gestión gastronómica. El frontend es la interfaz destinada al cliente y al personal del establecimiento. Alcance funcional del producto:

- **Gestión interna**: administrar usuarios y permisos, menú, platos, promociones, mesas, reservas, pedidos y producción de cocina.
- **Interfaz de cliente** (sin login): consultar el menú, acceder por QR de mesa + código del mozo, personalizar platos, realizar y consultar pedidos, solicitar reservas, consultar el total de consumo y la cuenta (web e impresa), y consultar el estado de los pedidos.
- **Platos**: controlar disponibilidad de la carta (habilitar/deshabilitar).
- **Mesas**: mesas dinámicas contra el CONFIG_MESA (aforo = Σ capacidad×cantidad). El mozo **crea la mesa cuando el cliente se sienta** (nace **ocupada**, con su cantidad de personas) y **cierra la visita al pagar** (borrado lógico). No existe "ocupar mesa" ni agrupar en la UI. Ver "Flujo de mesas — decisión del equipo" más abajo.
- **Reservas**: por web o por teléfono del local; por **personas + fecha + horario** (no se elige mesa): el backend asigna una combinación de capacidades del CONFIG_MESA y el mozo arma las mesas físicas cuando llega el grupo.
- **Notificaciones/alertas internas**: nuevos pedidos, pedidos listos, cambios de estado, llamar al mozo; mejoran la comunicación entre cliente, mozo, cocina y encargados.
- **Dashboard**: estadísticas e historial (cantidad de pedidos, ventas, platos más solicitados, reservas), historial de comandas (extravíos) y trazabilidad de acciones de usuarios.

## Flujo de cliente (auto-pedido) — implementado

- QR general: afiche único generado en `/gerente/mesas/qr` con el `origin` de la app
  (qrcode.react) que abre la carta (`/carta`). **QR por visita**: al crear la mesa
  (`CrearMesa`, mozo o gerente) se abre `QrMesaModal` con un QR que codifica
  `${origin}/mesa?codigo={codigo_acceso}` — **el QR es la credencial** (decisión
  del equipo): escanearlo lleva a `MesaPage`, que valida el PIN sola
  (`POST /acceso`) y deja al cliente identificado. Si el cliente ya tenía sesión
  de otra mesa, pide confirmación antes de cambiar (se descarta el borrador sin
  enviar); el parámetro se limpia de la URL tras procesarse. El PIN muere con la
  visita (borrado lógico al cerrar la mesa). El formulario manual de `/mesa`
  sigue siendo el fallback (PIN tipeado o QR inválido).
- La credencial del comensal es el `codigo_acceso` de la mesa (4 dígitos, lo reparte
  el mozo; el backend valida `size:4` y preserva ceros a la izquierda). Viaja como
  `Authorization: Bearer <codigo>` en `/cliente/*` (middleware `cliente` del backend;
  NO hay Sanctum ni `login-cliente` para el cliente).
- `/mesa` (pública, `MesaPage`): form de 4 dígitos → `POST /acceso` (público,
  throttle 60/min por IP → 429 con mensaje en español). Es de un solo uso: al
  validar, la página queda directamente en la tarjeta "Mesa identificada" (no se
  puede cambiar el código desde acá ni hay modal de éxito ni navegación
  automática). `ClienteProvider` guarda
  `{mesa, pedidoIds, confirmarPendiente, borrador}` en localStorage con la clave
  `gastro_cliente`. Al recargar se revalida con `GET /cliente/pedidos`: 401/403
  (código muerto) limpia la sesión; un fallo de red la conserva.
- **Estado compartido del cliente**: `src/context/ClienteContext/` —
  `ClienteProvider.tsx` (solo el Provider) + `useCliente.ts` (contexto y hook).
  Lo consumen `MesaPage`, `BotonAgregarPlato`, `PersonalizarPlatoModal` y
  `PedidoPage`. No leer `localStorage` ni fetchear `/cliente/*` desde componentes:
  todo pasa por `useCliente()`.
- **Borrador local** (en el navegador, no en el server): líneas mergeadas por clave
  `plato|ingredientes|excluir`; importes de presentación en `src/utils/borrador.ts`
  (`importeLinea`/`unitarioLinea`) — el backend recalcula el total real al crear el
  pedido. "Borrador" = sin enviar (editable/cancelable localmente); "Pedidos
  enviados" = `GET /cliente/pedidos` filtrado por los `pedidoIds` propios.
  `PedidoPage` tiene un toggle "Mi pedido | Cuenta": la vista Cuenta consume
  `GET /cliente/cuenta` (`getCuentaCliente` en `api/cliente.ts`) y muestra el
  total de la visita con las partes por pedido raíz (resaltando "Tu parte" con
  los `pedidoIds`; el `codigo_acceso` de la respuesta jamás se renderiza).
- **Enviar = `POST /cliente/pedidos` + `POST /cliente/pedidos/confirmar`** (las
  líneas nacen `confirmado=false`). El cliente NO puede pasar a `enviado`: esa
  transición está tras `auth:sanctum` + `permiso:tomar_pedidos` (la cocina la
  recibe por broadcast). Si anexar da 422 (el pedido
  ya no está en curso) se crea una raíz nueva; si falla la confirmación, la marca
  `confirmarPendiente` permite reintentar sin duplicar líneas.
- Reservas web del cliente (públicas con throttle): **no hay elección de mesa**
  — solo `contacto_solicitante`, fecha, hora y `cantPersonas`; el backend asigna
  la combinación de capacidades del CONFIG_MESA (422 = anticipación mínima de
  2 h, aforo insuficiente o conflicto de fecha+hora). La página consulta
  `GET /cliente/reservas/disponibilidad?fecha=&hora=` (capacidades libres del
  config para el intervalo) como referencia — **ruta ya registrada en el back**
  (antes daba 404; la vieja `GET /cliente/reservas/mesas` fue eliminada). La
  respuesta trae `reserva.id`: mostrarlo en el modal de éxito. El alta incluye un
  único `contacto_solicitante` (la capa API arma "Nombre (Tel: ...)").
- BottomNavbar (`useBottomNav`, `src/navigation/useBottomNav.ts`): sin sesión
  staff → `NAV_PUBLICO` (Carta, Mi pedido, Reservas, Mesa — todas con ruta); con
  sesión → `BOTTOM_POR_ROL[rol]` con fallback `NAV_PUBLICO`.
- **"Llamar al mozo" existe**: botón en `PedidoPage` → `llamarMozo()`
  (`POST /cliente/llamar`, Bearer `codigo_acceso`, sin body). Rate limit del
  back de 1/min por mesa → 429 con `message` en español (se muestra en un Alert
  warning); tras un aviso exitoso el botón queda deshabilitado ("Mozo avisado").
  El aviso al mozo por websocket (`empleado.atencion`) recién se verá con la
  integración de Reverb (pendiente).
- No existe rol CLIENTE en el front. El nombre del rol viene en la respuesta de
  `POST /login` (`usuario.rol {id, nombre}`) y se persiste en localStorage con la
  sesión; `useRol()` (`src/context/RolesContext/useRol.ts`) lo lee de ahí
  (`nombre`, `esGerente`, `usuario`, `loading: false` — no hay fetch). No hay
  provider/contexto de roles. `RequireAuth` recibe `rolesPermitidos` como
  **nombres** (`['Gerente']`) y resuelve `usuario.rol?.nombre`; si falta `rol`
  (sesión guardada anterior a este cambio) redirige a `/login` (forzar re-login).
  **No** se usa ningún fallback hardcodeado de ids para decidir acceso.
  `GET /roles` (con `Authorization: Bearer`) solo se llama desde las pantallas
  de alta/edición de usuarios en `/gerente/usuarios` (accesibles solo a Gerente;
  el archivo `Register.tsx` ya no existe). Cualquier sesión logueada = staff.
- Tras login, `Login.tsx` navega según el rol con el mapa `INICIO_POR_ROL`:
  Gerente → `/gerente`, Cocina → `/cocina`, Mozo → `/mozo`; rol desconocido o
  sin roles cargados → `/menu` (alias con `Navigate` a `/carta`).

## Flujo de mesas — decisión del equipo

- **El mozo crea la mesa cuando el cliente se sienta**: `POST /mesas` nace con
  `estado: 'ocupada'` y la cantidad de personas (capacidad). No existe "ocupar
  mesa": se eliminaron `OcuparMesaModal` y `ocuparMesa()`. En la práctica solo
  existen mesas ocupadas (los estados `libre`/`reservada` no los asigna este flujo).
- **Al pagar, se cierra la visita desde la mesa concreta**: `POST /mesas/{id}/cerrar`
  (`cerrarMesa()` + `CerrarMesaModal` de mesa única) → borrado lógico: el PIN deja
  de valer y se cancelan reservas pendientes; exige 0 pedidos activos (422). El
  gerente lo hace desde **EditarMesa** (`/gerente/mesas/gestion/:id/editar`,
  reemplaza al viejo "Eliminar mesa"/`deleteMesa`) y el mozo desde **MozoMesa**
  (vista Cuenta); ambos navegan al hub con `location.state.aviso`. Los hubs
  (`/mozo`, `/gerente/mesas/gestion`) ya no tienen botón ni modal de cierre.
  Ciclo de vida: crear (ocupada) → cerrar (eliminada); la lista de mesas = visitas
  en curso.
- **La UI no muestra estados de mesa** (decisión): sin badges en `MesaCard`, sin
  chips en Comandas, sin KPIs Libres/Ocupadas en el `Resumen` (solo "Totales"),
  sin campo Estado en EditarMesa ni en el Dashboard (solo aforo ocupado %). El
  campo `estado` se conserva internamente en tipos/normalización porque el
  backend lo exige en `POST/PUT /mesas` (`mesaSchema`). `ClienteMesa.estado` y
  `EstadoMesa` fueron eliminados.
- **El salón real es el CONFIG_MESA** (`GET /configuracion` público a empleados,
  `PUT /configuracion` del gerente con replace-all de filas `capacidad × cantidad`):
  aforo = Σ capacidad×cantidad (personas simultáneas máximas) y mesas máximas =
  Σ cantidad. Pantalla en `/gerente/mesas/configuracion`. Las mesas creadas se
  validan contra ese aforo (422 si se supera).
- **Agrupar/desagrupar quedó fuera de la UI** (decisión): los endpoints siguen en
  el back (`POST /mesas/agrupar|desagrupar`, solo lectura de resumen/cuenta) pero
  se borraron los botones, `GrupoMesaModal` y la capa API del front. La lectura de
  `grupo_codigo` (badges, "Mesas/Cuentas del grupo") se conserva inofensiva: se
  oculta sola si no hay grupo. La vieja "sesión compartida de envío" ya no existe:
  el auto-envío es por mesa (todas las líneas confirmadas → salen juntas).
- **Reservas no eligen mesa**: staff (`POST /reservas`) y cliente
  (`POST /cliente/reservas`) piden `{contacto_solicitante, fecha, hora, cantPersonas}`;
  el back asigna la combinación de capacidades del config. El select de mesas
  creadas se eliminó (`reservaSchema` ya no incluye `mesa_id`).
- **Nota para el equipo de back** (el front no toca el backend): `../documentacion/API-endpoints.md`
  quedó desactualizado (configuración = CONFIG_MESA, sin `/mesas/{id}/cerrar`,
  sin el módulo de cocina y `POST /reservas` ya sin `mesa_id`); el
  `../documentacion/CONTRATO-websockets.md` referenciado en `routes/channels.php`
  no existe; `ClienteController` tiene el método `llamar()` DUPLICADO (fatal
  error PHP que rompe `/cliente/*`); `DocsController.php` conserva un marcador
  de merge (`>>>>>>>`) commiteado; faltan push de `rama-EC` y redeploy en Render.

## Pedidos: 8 estados y tramos mozo/cocina

- `EstadoPedido` (`types/Mesa.ts`) tiene **8** estados: `en_curso, confirmado,
  enviado, en_preparacion, listo, entregado, cerrado, cancelado`.
- **Tramo del mozo** (`PedidoCard`, `PUT /pedidos/{id}/estado`): confirma, envía,
  reabre (`confirmado → en_curso`), entrega (`listo → entregado`), cierra
  (`entregado → cerrado`) y **cancela desde cualquier no final** (única acción
  en `enviado`/`en_preparacion`; esos estados los avanza la cocina).
- **Tramo de la cocina** (`/cocina`, `src/api/cocina.ts` + `pages/Cocina/Cocina.tsx`,
  permiso `preparar_pedidos`): `GET /cocina/pedidos` devuelve la cola (pedidos
  `enviado` + `en_preparacion` con mesa y líneas) y
  `PUT /cocina/pedidos/{id}/estado` sólo admite `{estado: 'en_preparacion' | 'listo'}`.
  La página es una lista de tarjetas con spinner por tarjeta y botón
  "Actualizar cola" (sin polling); la capa API normaliza números/nombres UNA vez
  y jamás mapea `codigo_acceso`.
- **`GET /cliente/pedidos` y `GET /mesas/{id}/pedidos` traen TODOS los pedidos de
  la visita** (activos y finalizados, cada uno con su `estado`): `PedidoCard` no
  renderiza acciones para `cerrado`/`cancelado` (sólo badge) y `PedidoPage`
  ("Pedidos enviados") pinta el badge con `COLOR_ESTADO`.

## Comandos

- `npm run dev` — servidor de desarrollo Vite
- `npm run lint` — ESLint (flat config)
- `npm run build` — `tsc -b && vite build`; también cumple la función de typecheck (no hay script de typecheck separado)
- No existe framework ni script de tests — no inventar uno.

## Entorno

- La URL base del backend sale de `.env`: `VITE_API_URL` (default `http://127.0.0.1:8000/api`), expuesta via `src/config/env.ts` (`API_BASE_URL`). Las rutas de la API se concatenan a esa base (ej. `/platos`).
- `.env` está commiteado y solo contiene la URL de la API (sin secretos).

## Arquitectura y convenciones

- Los datos reales vienen de la API del backend. `src/data/platos.json` es solo un mock de diseño con otro schema (`restaurante/categorias/platos`); no tomarlo como contrato de la API. Los tipos de dominio viven en `src/types/Menu.ts`: `PlatoListar` (lista, con `categoria_nombre`, sin `ingredientes`), `PlatoObtener` (show/respuesta de POST, con `ingredientes` y `categoria_id`, sin `categoria_nombre`), `PlatoInput` (= `z.infer` de `platoSchema`) y `PlatoResponse`. `types/Plato.ts` fue eliminado; no reintroducirlo.
- **Tipos de datos, no de presentación**: `precio: number` y `disponible: boolean` en los tipos de dominio. El backend manda `precio` como string en GET y number en POST (sin `$casts`), y `disponible` como 1/0 en GET y boolean en POST — **no se toca el backend**; la conversión ocurre UNA sola vez en la capa de API (`src/api/platos.ts`, `Number()`/`Boolean()` al recibir). `formatearPrecio()` se aplica solo en la vista. No repetir conversiones en componentes.
- Capa de API en `src/api/` (`platos.ts`, `categorias.ts`, `ingredientes.ts`, `pedidos.ts`, `cliente.ts`, `cocina.ts`, `reservas.ts`, `mesas.ts`, `auth.ts`, `error.ts`, `usuarios.ts`, `promociones.ts`, `dashboard.ts`, `configuracion.ts`): funciones que hablan con `API_BASE_URL`, lanzan `Error` en español si el status no es 2xx, y normalizan tipos. El ABM usa `createPlatos` (POST) en vez de fetch inline. `cliente.ts` usa `ErrorCliente` (con `status`) para distinguir 401 (código muerto) de 422 (regla de negocio) en el flujo del comensal.
- Validación con Zod **v4** en `src/schemas/` (ver `schemas/menu.ts` → `platoSchema`, `schemas/auth.ts`, `schemas/cliente.ts`); los tipos de input se derivan con `z.infer<>`. Zod v4: mensajes con `{ error: '...' }`, fecha con `z.iso.date()`. `precio` usa `.positive()` (precio $0 no permitido — decisión, mantener).
- Estilos: Bootstrap + CSS Modules por componente (`*.module.css`, importados como `s`). Los design tokens viven en `src/styles/tokens.css`, importados DESPUÉS de `bootstrap.min.css` en `src/main.tsx` — preservar ese orden. Clases utilitarias como `text-headline-lg`, `text-body-md`, `text-price-display`, `elevation-1` son tokens propios, no de Bootstrap; preferirlas sobre colores/fuentes hardcodeadas.
- Fetch de datos: hooks en `src/hooks` (`usePlatos`, `useCategorias`, `useIngredientes`) consultan `API_BASE_URL` con `AbortController`; seguir este patrón en fetches nuevos (abortar al desmontar, mensaje de error en español si el status no es 2xx). Dentro de componentes, el set de estado va en los callbacks async (`.then`/`.catch` o `try/catch` de una IIFE) — ver `usePlatos` o `CrearReserva`.
- **`set-state-in-effect` (ESLint, react-hooks v7)**: está prohibido hacer `setX` síncrono en el body de un `useEffect`. El estado de carga se deriva (ej. `cargando = resumen === null && !error`) o se setea dentro del callback async. El reset limpio de modales se logra por remount: render condicional + `key` (ver `PersonalizarPlatoModal`).
- Las rutas se declaran centralmente en `src/App.tsx` (NO hay catch-all `*`: un link a una ruta inexistente queda en blanco). Públicas de cliente: `/` (landing), `/carta`, `/plato/:id`, `/pedido`, `/reservas`, `/mesa`, y `/menu` (alias `Navigate` → `/carta`, repara el fallback de RequireAuth/Login). Staff: `/login`, `/cocina` (RequireAuth Cocina; cola de cocina implementada), `/mozo` + `/mozo/mesas/crear`, `/mozo/mesas/:id`, `/mozo/reservas*` (RequireAuth Mozo). Sección de gerente bajo `/gerente` protegida con `RequireAuth rolesPermitidos={['Gerente']}` + `<Outlet/>` anidado: Dashboard, Carta ABM (`/gerente/carta/platos`, `/categorias`, `/ingredientes`, `/promociones` con `/crear` y `/:id/editar`), ABM de usuarios en `/gerente/usuarios` (hub, `/crear`, `/:id/editar`), Mesas (`/gestion`, `/gestion/:id/editar`, `/configuracion`, `/qr`, `/comandas`), Reservas (hub/crear/editar). La ruta `/register` fue eliminada: el alta de usuarios vive en `/gerente/usuarios/crear` (el backend registra en `POST /usuarios/registrar`, no `POST /usuarios`). Páginas en `src/pages`, layouts en `src/layouts`. El placeholder de pantallas sin armar es `src/components/Building.tsx` (usado por la página Gerente).
- **Rutas rotas conocidas** (links en el código sin ruta — pendientes, ajenos a la feature de cliente): `/mozo/mesas` (2 links "Volver a mesas" en `MozoMesa.tsx`; la lista real del mozo es `/mozo`) y `/gerente/historial-acciones` (`secciones.ts`; el historial real de comandas es `/gerente/mesas/comandas`). `/plato/:id`, `/pedido`, `/reservas`, `/mesa`, `/unir-mesa`→`/mesa` ya están resueltas.
- TypeScript estricto con `verbatimModuleSyntax` y `erasableSyntaxOnly`: usar `import type` para imports solo de tipos; sin enums/namespaces ni parámetros-de-propiedad de clase.
- Los precios se formatean con `Intl.NumberFormat('es-AR', { currency: 'ARS' })`.
- `react-refresh/only-export-components` (ESLint): un archivo con componentes NO exporta constantes ni funciones — por eso el context está partido en `RolesContext.tsx` (solo el Provider) y `useRoles.ts` (contexto, hook y constantes).
  **Actualización**: el provider y el contexto de roles fueron eliminados; `src/context/RolesContext/` hoy solo contiene `useRol.ts` (hook puro, sin contexto de React).
- Tipos del cliente en `src/types/Cliente.ts` (`ClienteMesa`, `LineaBorrador` con `clave`, `SesionCliente`); los tipos de reserva web (`MesaReservaWeb`, `ReservaWebAlta`) y el resumen de comanda (`ResumenMesa`, `PedidoResumen`) están en `types/Reserva.ts` y `types/Mesa.ts` (shapes espejo del backend — no duplicarlos).