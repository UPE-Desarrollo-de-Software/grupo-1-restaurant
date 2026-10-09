# GastroApp frontend (frontPrueba)

Vite + React 19 + TypeScript SPA. React Router 7, Bootstrap 5 + react-bootstrap + bootstrap-icons. Todos los textos del contenido, componentes y mensajes de error están en español.

## Proyecto

GastroApp es un sistema de gestión gastronómica. El frontend es la interfaz destinada al cliente y al personal del establecimiento. Alcance funcional del producto:

- **Gestión interna**: administrar usuarios y permisos, menú, productos, promociones, mesas, reservas, pedidos y producción de cocina.
- **Interfaz de cliente** (sin login): consultar el menú, acceder por QR de mesa + código del mozo, personalizar productos, realizar y consultar pedidos, solicitar reservas, consultar el total de consumo y la cuenta (web e impresa), y consultar el estado de los pedidos.
- **Productos**: controlar disponibilidad de la carta (habilitar/deshabilitar).
- **Mesas**: administrar capacidad, plaza, disponibilidad y estado; asociar códigos QR y gestionar sesiones de atención. Permite agrupar temporalmente dos o más mesas en una sesión compartida: cada persona arma su pedido, y la comanda solo se envía cuando todos los del grupo confirman (o cuando el mozo cierra la sesión de pedidos). Cumplido eso se confirma el resumen del pedido total.
- **Reservas**: por web o por teléfono del local; validar disponibilidad/conflictos de fecha, horario, capacidad y mesa.
- **Notificaciones/alertas internas**: nuevos pedidos, pedidos listos, cambios de estado, llamar al mozo; mejoran la comunicación entre cliente, mozo, cocina y encargados.
- **Dashboard**: estadísticas e historial (cantidad de pedidos, ventas, productos más solicitados, reservas), historial de comandas (extravíos) y trazabilidad de acciones de usuarios.

## Flujo QR / PIN (cliente en mesa)

- El QR de cada mesa es estático y secuencial: `${origin}/mesa/{id}`. El QR identifica
  la mesa, NO es credencial; la seguridad es el PIN.
- PIN = `codigoGrupal` del backend (4 dígitos), lo genera el mozo al abrir la sesión
  (`POST /mesas/{mesa}/sesion`); muere al cerrar la sesión. Solo gerente crea mesas.
- `/mesa/:id` es pública. Sin PIN: carta (lectura), reserva, ingresar PIN. Con PIN:
  `POST /login-cliente` → guarda `token_cliente` + `sesion_cliente` en localStorage
  (claves separadas de las del empleado `token`/`usuario`; RequireAuth usa esas).
- BottomNavbar actual (`src/components/BottomNavbar/`): elige menú por rol con
  `useRol()` — `esGerente` muestra `OPCIONES_GERENTE` (Panel, Carta, Mesas,
  Reservas bajo `/gerente`), si no `OPCIONES_CLIENTE` (Carta, Mi pedido,
  Reservas, Mesa). **Hacia la feature QR**: quedará doble menú por sesión de
  cliente — sin sesión [Inicio, Reservar, Mi mesa]; con sesión [Mi pedido,
  Reservar, Mi mesa] (reacciona al contexto, no a localStorage directo).
- No existe rol CLIENTE en el front. Los roles son dinámicos: se cargan con
  `GET /roles` vía `RolesContext` (`src/context/RolesContext/`) y se consumen
  con el helper `useRoles()`. `useRol()` (mismo folder) agrega `nombre`,
  `esGerente` y `usuario` resueltos contra ese contexto. `RequireAuth` recibe
  `rolesPermitidos` como **nombres** (`['Gerente']`) y resuelve
  `usuario.rol_id` → nombre contra la API. Si el fetch falla, se usa un
  fallback hardcodeado con ids fijos 1/2/3 (Gerente/Cocina/Mozo) en
  `ROLES_FALLBACK`. Cualquier sesión logueada = staff.
- Tras login, `Login.tsx` navega según el rol con el mapa `INICIO_POR_ROL`:
  Gerente → `/gerente`, Cocina → `/cocina`, Mozo → `/mozo`; rol desconocido o
  sin roles cargados → `/menu`. **Pendiente**: crear rutas `/cocina` y `/mozo`
  (hoy no existen en `App.tsx`; un Cocina/Mozo logueado cae en pantalla vacía).
- Sin PIN no hay datos de sesión/carrito/consumo. Rate-limit en intentos de PIN.

## Comandos

- `npm run dev` — servidor de desarrollo Vite
- `npm run lint` — ESLint (flat config)
- `npm run build` — `tsc -b && vite build`; también cumple la función de typecheck (no hay script de typecheck separado)
- No existe framework ni script de tests — no inventar uno.

## Entorno

- La URL base del backend sale de `.env`: `VITE_API_URL` (default `http://127.0.0.1:8000/api`), expuesta via `src/config/env.ts` (`API_BASE_URL`). Las rutas de la API se concatenan a esa base (ej. `/productos`).
- `.env` está commiteado y solo contiene la URL de la API (sin secretos).

## Arquitectura y convenciones

- Los datos reales vienen de la API del backend. `src/data/productos.json` es solo un mock de diseño con otro schema (`restaurante/categorias/platos`); no tomarlo como contrato de la API. Los tipos de dominio viven en `src/types/Menu.ts`: `ProductoListar` (lista, con `categoria_nombre`, sin `ingredientes`), `ProductoObtener` (show/respuesta de POST, con `ingredientes` y `categoria_id`, sin `categoria_nombre`), `ProductoInput` (= `z.infer` de `productoSchema`) y `ProductoResponse`. `types/Producto.ts` fue eliminado; no reintroducirlo.
- **Tipos de datos, no de presentación**: `precio: number` y `disponible: boolean` en los tipos de dominio. El backend manda `precio` como string en GET y number en POST (sin `$casts`), y `disponible` como 1/0 en GET y boolean en POST — **no se toca el backend**; la conversión ocurre UNA sola vez en la capa de API (`src/api/productos.ts`, `Number()`/`Boolean()` al recibir). `formatearPrecio()` se aplica solo en la vista. No repetir conversiones en componentes.
- Capa de API en `src/api/` (`productos.ts`, `categorias.ts`, `ingredientes.ts`): funciones que hablan con `API_BASE_URL`, lanzan `Error` en español si el status no es 2xx, y normalizan tipos. El ABM usa `createProductos` (POST) en vez de fetch inline.
- Validación con Zod en `src/schemas/` (ver `schemas/menu.ts` → `productoSchema`, `schemas/auth.ts`); los tipos de input se derivan con `z.infer<>`. `precio` usa `.positive()` (precio $0 no permitido — decisión, mantener).
- Estilos: Bootstrap + CSS Modules por componente (`*.module.css`, importados como `s`). Los design tokens viven en `src/styles/tokens.css`, importados DESPUÉS de `bootstrap.min.css` en `src/main.tsx` — preservar ese orden. Clases utilitarias como `text-headline-lg`, `text-body-md`, `text-price-display`, `elevation-1` son tokens propios, no de Bootstrap; preferirlas sobre colores/fuentes hardcodeadas.
- Fetch de datos: hooks en `src/hooks` (`useProductos`, `useCategorias`, `useIngredientes`) consultan `API_BASE_URL` con `AbortController`; seguir este patrón en fetches nuevos (abortar al desmontar, mensaje de error en español si el status no es 2xx).
- Las rutas se declaran centralmente en `src/App.tsx`. Hoy existen: `/` (landing), `/menu`, `/login`, `/register` (protegida, solo Gerente); sección de gerente bajo `/gerente` protegida con `RequireAuth rolesPermitidos={['Gerente']}` + `<Outlet/>` anidado (Dashboard, Carta con ABM en `/gerente/carta/productos`, Disponibilidad, Promociones, Mesas, Reservas, Usuarios, Historial de acciones). Páginas en `src/pages`, layouts en `src/layouts`. El placeholder de pantallas sin armar es `src/components/Building.tsx` (usado por las páginas Gerente).
- **Rutas rotas conocidas** (links en el código sin ruta — decisión: pendientes para futura feature, no confundir con bugs): `/producto/:id` (ProductCard), `/unir-mesa` (BottomNavbar y ConexionMesa), `/pedido`, `/reservas` (opciones cliente del BottomNavbar), `/cocina` y `/mozo` (destinos del login).
- TypeScript estricto con `verbatimModuleSyntax` y `erasableSyntaxOnly`: usar `import type` para imports solo de tipos; sin enums/namespaces ni parámetros-de-propiedad de clase.
- Los precios se formatean con `Intl.NumberFormat('es-AR', { currency: 'ARS' })`.
- `react-refresh/only-export-components` (ESLint): un archivo con componentes NO exporta constantes ni funciones — por eso el context está partido en `RolesContext.tsx` (solo el Provider) y `useRoles.ts` (contexto, hook y constantes).