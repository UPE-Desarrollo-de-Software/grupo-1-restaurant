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

## Comandos

- `npm run dev` — servidor de desarrollo Vite
- `npm run lint` — ESLint (flat config)
- `npm run build` — `tsc -b && vite build`; también cumple la función de typecheck (no hay script de typecheck separado)
- No existe framework ni script de tests — no inventar uno.

## Entorno

- La URL base del backend sale de `.env`: `VITE_API_URL` (default `http://127.0.0.1:8000/api`), expuesta via `src/config/env.ts` (`API_BASE_URL`). Las rutas de la API se concatenan a esa base (ej. `/productos`).
- `.env` está commiteado y solo contiene la URL de la API (sin secretos).

## Arquitectura y convenciones

- Los datos reales vienen de la API del backend. `src/data/productos.json` es solo un mock de diseño con otro schema (`restaurante/categorias/platos`); no tomarlo como contrato de la API. La forma real es `src/types/Producto.ts` (campos snake_case, `disponible: number`).
- Estilos: Bootstrap + CSS Modules por componente (`*.module.css`, importados como `s`). Los design tokens viven en `src/styles/tokens.css`, importados DESPUÉS de `bootstrap.min.css` en `src/main.tsx` — preservar ese orden. Clases utilitarias como `text-headline-lg`, `text-body-md`, `text-price-display`, `elevation-1` son tokens propios, no de Bootstrap; preferirlas sobre colores/fuentes hardcodeadas.
- Fetch de datos: hooks en `src/hooks` (ver `useProductos`) consultan `API_BASE_URL` con `AbortController`; seguir este patrón en fetches nuevos (abortar al desmontar, mensaje de error en español si el status no es 2xx).
- Las rutas se declaran centralmente en `src/App.tsx`. Solo existe `/carta`; `ProductCard` ya enlaza a `/productos/:id` pero no tiene ruta definida aún. Páginas en `src/pages`, layouts en `src/layouts`.
- TypeScript estricto con `verbatimModuleSyntax` y `erasableSyntaxOnly`: usar `import type` para imports solo de tipos; sin enums/namespaces ni parámetros-de-propiedad de clase.
- Los precios se formatean con `Intl.NumberFormat('es-AR', { currency: 'ARS' })`.