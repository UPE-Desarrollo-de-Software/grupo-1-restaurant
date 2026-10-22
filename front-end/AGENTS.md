# GastroApp frontend (frontPrueba)

Vite + React 19 + TypeScript SPA. React Router 7, Bootstrap 5 + react-bootstrap + bootstrap-icons. Todos los textos del contenido, componentes y mensajes de error están en español.

## Proyecto

GastroApp es un sistema de gestión gastronómica. El frontend es la interfaz destinada al cliente y al personal del establecimiento. Alcance funcional del producto:

- **Gestión interna**: administrar usuarios y permisos, menú, platos, promociones, mesas, reservas, pedidos y producción de cocina.
- **Interfaz de cliente** (sin login): consultar el menú, acceder por QR de mesa + código del mozo, personalizar platos, realizar y consultar pedidos, solicitar reservas, consultar el total de consumo y la cuenta (web e impresa), y consultar el estado de los pedidos.
- **Platos**: controlar disponibilidad de la carta (habilitar/deshabilitar).
- **Mesas**: administrar capacidad, plaza, disponibilidad y estado; asociar códigos QR y gestionar sesiones de atención. Permite agrupar temporalmente dos o más mesas en una sesión compartida: cada persona arma su pedido, y la comanda solo se envía cuando todos los del grupo confirman (o cuando el mozo cierra la sesión de pedidos). Cumplido eso se confirma el resumen del pedido total.
- **Reservas**: por web o por teléfono del local; validar disponibilidad/conflictos de fecha, horario, capacidad y mesa.
- **Notificaciones/alertas internas**: nuevos pedidos, pedidos listos, cambios de estado, llamar al mozo; mejoran la comunicación entre cliente, mozo, cocina y encargados.
- **Dashboard**: estadísticas e historial (cantidad de pedidos, ventas, platos más solicitados, reservas), historial de comandas (extravíos) y trazabilidad de acciones de usuarios.

## Flujo de cliente (auto-pedido) — implementado

- QR actual: afiche único generado en `/gerente/mesas/qr` con el `origin` de la app
  (qrcode.react) que abre la landing ("/"). El QR por mesa (`${origin}/mesa/{id}`)
  sigue pendiente; el QR identificaría la ubicación, NO es credencial.
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
  transición está tras `auth:sanctum` + `permiso:tomar_pedidos` y `CocinaPage`
  sigue siendo placeholder (no existe `GET /pedidos`). Si anexar da 422 (el pedido
  ya no está en curso) se crea una raíz nueva; si falla la confirmación, la marca
  `confirmarPendiente` permite reintentar sin duplicar líneas.
- Reservas web del cliente (públicas con throttle): `GET /cliente/reservas/mesas`
  (mapa: solo id/capacidad/estado, nunca el código) y `POST /cliente/reservas`
  (alta; sin `mesa_id` el backend crea la mesa como "mozo virtual" validando el
  aforo; 422 = anticipación mínima de 2 h, aforo o conflicto de fecha+hora). La
  respuesta trae `reserva.id`: mostrarlo en el modal de éxito. El alta incluye un
  único `contacto_solicitante` (la capa API arma "Nombre (Tel: ...)"). La ruta
  `POST /cliente/reservas/cancelar` NO está conectada: cancela TODAS las reservas
  pendientes de la mesa.
- BottomNavbar (`useBottomNav`, `src/navigation/useBottomNav.ts`): sin sesión
  staff → `NAV_PUBLICO` (Carta, Mi pedido, Reservas, Mesa — todas con ruta); con
  sesión → `BOTTOM_POR_ROL[rol]` con fallback `NAV_PUBLICO`.
- No existe "Llamar al mozo": no hay endpoint de notificaciones en el backend; el
  botón quedó descartado (decisión, no bug).
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
- Capa de API en `src/api/` (`platos.ts`, `categorias.ts`, `ingredientes.ts`, `pedidos.ts`, `cliente.ts`, `reservas.ts`, `mesas.ts`, `auth.ts`, `error.ts`, `usuarios.ts`, `promociones.ts`, `dashboard.ts`): funciones que hablan con `API_BASE_URL`, lanzan `Error` en español si el status no es 2xx, y normalizan tipos. El ABM usa `createPlatos` (POST) en vez de fetch inline. `cliente.ts` usa `ErrorCliente` (con `status`) para distinguir 401 (código muerto) de 422 (regla de negocio) en el flujo del comensal.
- Validación con Zod **v4** en `src/schemas/` (ver `schemas/menu.ts` → `platoSchema`, `schemas/auth.ts`, `schemas/cliente.ts`); los tipos de input se derivan con `z.infer<>`. Zod v4: mensajes con `{ error: '...' }`, fecha con `z.iso.date()`. `precio` usa `.positive()` (precio $0 no permitido — decisión, mantener).
- Estilos: Bootstrap + CSS Modules por componente (`*.module.css`, importados como `s`). Los design tokens viven en `src/styles/tokens.css`, importados DESPUÉS de `bootstrap.min.css` en `src/main.tsx` — preservar ese orden. Clases utilitarias como `text-headline-lg`, `text-body-md`, `text-price-display`, `elevation-1` son tokens propios, no de Bootstrap; preferirlas sobre colores/fuentes hardcodeadas.
- Fetch de datos: hooks en `src/hooks` (`usePlatos`, `useCategorias`, `useIngredientes`) consultan `API_BASE_URL` con `AbortController`; seguir este patrón en fetches nuevos (abortar al desmontar, mensaje de error en español si el status no es 2xx). Dentro de componentes, el set de estado va en los callbacks async (`.then`/`.catch` o `try/catch` de una IIFE) — ver `usePlatos` o `CrearReserva`.
- **`set-state-in-effect` (ESLint, react-hooks v7)**: está prohibido hacer `setX` síncrono en el body de un `useEffect`. El estado de carga se deriva (ej. `cargando = resumen === null && !error`) o se setea dentro del callback async. El reset limpio de modales se logra por remount: render condicional + `key` (ver `PersonalizarPlatoModal`).
- Las rutas se declaran centralmente en `src/App.tsx` (NO hay catch-all `*`: un link a una ruta inexistente queda en blanco). Públicas de cliente: `/` (landing), `/carta`, `/plato/:id`, `/pedido`, `/reservas`, `/mesa`, y `/menu` (alias `Navigate` → `/carta`, repara el fallback de RequireAuth/Login). Staff: `/login`, `/cocina` (RequireAuth Cocina; placeholder), `/mozo` + `/mozo/mesas/crear`, `/mozo/mesas/:id`, `/mozo/reservas*` (RequireAuth Mozo). Sección de gerente bajo `/gerente` protegida con `RequireAuth rolesPermitidos={['Gerente']}` + `<Outlet/>` anidado: Dashboard, Carta ABM (`/gerente/carta/platos`, `/categorias`, `/ingredientes`, `/promociones` con `/crear` y `/:id/editar`), ABM de usuarios en `/gerente/usuarios` (hub, `/crear`, `/:id/editar`), Mesas (`/gestion`, `/gestion/:id/editar`, `/qr`, `/comandas`), Reservas (hub/crear/editar). La ruta `/register` fue eliminada: el alta de usuarios vive en `/gerente/usuarios/crear` (el backend registra en `POST /usuarios/registrar`, no `POST /usuarios`). Páginas en `src/pages`, layouts en `src/layouts`. El placeholder de pantallas sin armar es `src/components/Building.tsx` (usado por las páginas Gerente y `CocinaPage`).
- **Rutas rotas conocidas** (links en el código sin ruta — pendientes, ajenos a la feature de cliente): `/mozo/mesas` (2 links "Volver a mesas" en `MozoMesa.tsx`; la lista real del mozo es `/mozo`) y `/gerente/historial-acciones` (`secciones.ts`; el historial real de comandas es `/gerente/mesas/comandas`). `/plato/:id`, `/pedido`, `/reservas`, `/mesa`, `/unir-mesa`→`/mesa` ya están resueltas.
- TypeScript estricto con `verbatimModuleSyntax` y `erasableSyntaxOnly`: usar `import type` para imports solo de tipos; sin enums/namespaces ni parámetros-de-propiedad de clase.
- Los precios se formatean con `Intl.NumberFormat('es-AR', { currency: 'ARS' })`.
- `react-refresh/only-export-components` (ESLint): un archivo con componentes NO exporta constantes ni funciones — por eso el context está partido en `RolesContext.tsx` (solo el Provider) y `useRoles.ts` (contexto, hook y constantes).
  **Actualización**: el provider y el contexto de roles fueron eliminados; `src/context/RolesContext/` hoy solo contiene `useRol.ts` (hook puro, sin contexto de React).
- Tipos del cliente en `src/types/Cliente.ts` (`ClienteMesa`, `LineaBorrador` con `clave`, `SesionCliente`); los tipos de reserva web (`MesaReservaWeb`, `ReservaWebAlta`) y el resumen de comanda (`ResumenMesa`, `PedidoResumen`) están en `types/Reserva.ts` y `types/Mesa.ts` (shapes espejo del backend — no duplicarlos).