# DER v2.1 ↔ Backend — mapeo y decisiones

Documento de referencia de la alineación del backend con el DER v2.1
(`documentacion/DER-v2.1.dio`, **el diagrama dibujado es la fuente de
verdad**; el `mermaidData` embebido en el `.dio` quedó actualizado para
que refleje ese dibujo).

Fecha de la alineación: octubre 2026.

---

## 1. Decisiones tomadas

| # | Decisión |
|---|---|
| 1 | **SESION / MESA_SESION / CLIENTES quedaron fuera del modelo activo.** El DER v2.1 las eliminó. Las tablas y el código se conservan "congelados" (por si la funcionalidad vuelve en otra entidad), pero **no tienen rutas ni participan en pedidos**: no existe más el login de clientes por código grupal. |
| 2 | `DETALLE_PEDIDO` usa `precio_lista` + **`subtotal`** (el nombre del DER dibujado; no se agregó una columna `descuento` separada: se deriva del subtotal). |
| 3 | `PROMOCION` es fiel al DER: se eliminaron `ambito`, `condiciones` (JSON) y las tablas **`promocion_categoria`** y **`promocion_producto`**. El alcance lo dan `platos.promocion_id` (catálogo) y `detalle_pedidos.promocion_id` (histórico). |
| 4 | La autorización usa **`PERMISO` / `ROL_PERMISO`**: los middlewares consultan permisos (middleware `permiso:nombre`), no strings literales del rol. |
| 5 | **PRODUCTO pasó a llamarse PLATO** en todo el código: tabla `platos`, modelos `Plato`, controlador `PlatoController`, servicio `PlatoService`, rutas `/api/platos` y campo `plato_id`. |

---

## 2. Mapeo entidad ↔ tabla

| Entidad del DER | Tabla en la BD | Notas |
|---|---|---|
| `ROL` | `rol` | + relación N:N con permisos (pivot `rol_permiso`) |
| `PERMISO` | `permisos` | **nueva**. `nombre` único + `modulo` |
| `ROL_PERMISO` | `rol_permiso` | **nueva**. PK compuesta lógica (unique par), sin timestamps |
| `USUARIO` | `usuarios` | Sin cambios de columnas; + método `tienePermiso()` |
| `MESA` | `mesas` | + `usuario_id` (mozo responsable, nullable) · + `codigo_mesa` · `estado`: `libre` \| `ocupada` \| `reservada` |
| `RESERVA` | `reservas` | − `sesion_id` · `nombre_solicitante` · `contacto_solicitante` · `estado`: `pendiente` \| `cancelada` \| `finalizada` \| `no_asistio` |
| `CATEGORIA` | `categorias` | Sin cambios |
| `PLATO` | `platos` | Antes `productos`. + `promocion_id` FK nullable (oferta vigente, 0..1 promo por plato) |
| `INGREDIENTE` | `ingredientes` | − `opcional` (se mudó al pivot). `precioAdicional` conserva el camelCase del DER |
| `PLATO_INGREDIENTE` | `plato_ingrediente` | Antes `producto_ingrediente`. + `opcional` · + `por_defecto` |
| `PROMOCION` | `promociones` | − `ambito` · − `condiciones` · se eliminaron `promocion_categoria` y `promocion_producto` |
| `PEDIDO` | `pedidos` | − `sesion_id` · − `cliente_id` · + `mesa_id` FK · `estado`: `en_curso` \| `enviado` \| `en_preparacion` \| `entregado` \| `cerrado` \| `cancelado` |
| `DETALLE_PEDIDO` | `detalle_pedidos` | `producto_id` → `plato_id` · `precio_final` → **`subtotal`** · + `promocion_id` FK nullable (histórico) |
| `DETALLE_INGREDIENTE` | `detalle_pedido_ingrediente` | + `tipo` (`excluido` \| `agregado`) · `precio_adicional` nullable (solo en agregados) |
| — | `sesiones`, `mesa_sesion`, `clientes` | **Congeladas** (fuera del DER v2.1). Ver §5 |

Extensiones aceptadas (no figuran en el DER pero se mantienen):

- PKs `id` autoincrement (convención Laravel) en vez de `*_id`.
- `timestamps` (`created_at` / `updated_at`) en las tablas de entidad.
- `usuarios.activo` y `categorias.activo` (baja lógica).
- PK sustituto `id` en los pivots (`plato_ingrediente`,
  `rol_permiso`, `detalle_pedido_ingrediente`), en vez de PK compuesta.
- Nombre de tabla `detalle_pedido_ingrediente` (el DER la llama
  `DETALLE_INGREDIENTE`; renombrarla no aporta y rompería datos).

---

## 3. Reglas de negocio implementadas

- **1 pedido no-finalizado por mesa**: `PedidoService::agregarProducto()`
  reutiliza el pedido `en_curso` de la mesa y rechaza agregar líneas si
  el pedido activo ya fue enviado.
- **Estados y mesa**: el primer pedido pone la mesa en `ocupada`;
  `cerrado` / `cancelado` la devuelven a `libre` (si no quedan pedidos
  activos). Flujo: `en_curso → enviado → en_preparacion → entregado →
  cerrado`, con `cancelado` permitido desde cualquier estado no final.
- **Personalización de líneas** (flags de `plato_ingrediente`):
  - agregar: solo si `opcional = true` y `por_defecto = false`; cobra
    `precioAdicional` (de catálogo) por unidad.
  - excluir: solo si `opcional = true` y `por_defecto = true`; **no
    modifica el precio** (decisión del DER).
  - todo ingrediente debe pertenecer al plato del detalle.
- **Fórmula de la línea**:
  `subtotal = cantidad × (precio_lista + Σ precio_adicional de agregados) − descuento`.
  Hoy el descuento es 0: la integración del motor de promociones dentro
  de `PedidoService` sigue pendiente (`PLAN-promociones.md`);
  `detalle_pedidos.promocion_id` ya existe para congelarlo.
- **Promociones** (`PromocionService`): se conservan las fórmulas por
  `tipo` (porcentaje, monto_fijo, precio_fijo, 2x1) y la vigencia por
  fechas; se eliminaron las `condiciones` JSON (hora/días/cantidad
  mínima) por fidelidad al DER.

---

## 4. Permisos y endpoints

Los permisos se siembran en `PermisoSeeder` (por módulo) y se asignan
en `RolSeeder`:

| Rol | Permisos |
|---|---|
| Gerente | todos |
| Mozo | `ver_carta`, `ver_pedidos`, `tomar_pedidos`, `gestionar_reservas` |
| Cocina | `ver_carta`, `ver_pedidos` |
| Cliente | ninguno (rol de la funcionalidad congelada) |

El middleware `permiso:nombre` (`app/Http/Middleware/TienePermiso.php`)
reemplazó a los viejos aliases `gerente` / `mozo` (y a los strings
literales `'Gerente'` / `'Mozo'`). El alias `cliente` sigue registrado
en `bootstrap/app.php` pero ninguna ruta lo usa.

Endpoints nuevos/de operación (antes manejados por sesiones):

| Método | Ruta | Permiso |
|---|---|---|
| GET | `/api/mesas/{mesa}/pedido-activo` | `tomar_pedidos` |
| POST | `/api/mesas/{mesa}/pedidos` | `tomar_pedidos` |
| POST | `/api/pedidos/{pedido}/enviar` | `tomar_pedidos` |
| PUT | `/api/pedidos/{pedido}/estado` | `tomar_pedidos` |
| GET | `/api/mesas`, `/api/mesas/disponibles`, `/api/mesas/{mesa}` | cualquier empleado |
| POST/PUT/DELETE | `/api/mesas[...]` | `gestionar_mesas` |

Los CRUD de `platos` reemplazan a los de `productos` (`/api/platos`),
y el de platos acepta `ingredientes` como lista de objetos con
`ingrediente_id`, `opcional` y `por_defecto` (o ids sueltos, con
defaults `opcional=true` / `por_defecto=true`).

---

## 5. Entidades congeladas (conservadas, desconectadas del DER)

| Tabla / clases | Motivo |
|---|---|
| `sesiones` + `app/Models/Sesion.php` + `app/Services/SesionService.php` + `app/Http/Controllers/SesionController.php` + `app/Http/Controllers/MozoController.php` | La entidad SESION se eliminó del DER v2.1. El login de clientes por código grupal, el alta/cierre de sesiones del mozo y sus rutas fueron desconectados; el código queda por si la funcionalidad vuelve en otra entidad. |
| `mesa_sesion` + la relación `Mesa::sesiones()` / `Sesion::mesas()` | Mismo caso. |
| `clientes` + `app/Models/Cliente.php` + `app/Http/Middleware/ClienteMiddleware.php` + alias `cliente` | "Dividir la cuenta" y clientes recurrentes quedaron fuera del MVP (limitación #1 de `DER-v2.1-cambios.md`). |

Estas tablas **no tienen FK hacia ni desde las tablas del modelo
activo** (en particular, `pedidos` ya no las referencia), así que se
pueden dropear en el futuro sin tocar el flujo vigente.

---

## 6. Divergencias conocidas entre el diagrama y este documento

- El DER dibujado muestra `USUARIO 1 ── 1 MESA` y `MESA 1 ── 1 PEDIDO`
  en el edge `atiende` / `genera`; el modelo implementado (y el cuadro
  de notas de `DER-v2.1-cambios.md`) es **1 mozo : N mesas** y
  **1 mesa : N pedidos** (con la regla de 1 activo por mesa). Conviene
  corregir la cardinalidad dibujada.
- Faltan dibujar dos líneas que sí existen como FK: `RESERVA.usuario_id`
  (→ USUARIO) y `DETALLE_INGREDIENTE.ingrediente_id` (→ INGREDIENTE).
- `codigo_mesa`: queda pendiente definir si es PIN o identificador
  visible y marcarlo `UNIQUE` (normalización postergada, §6 de
  `DER-v2.1-cambios.md`).

---

## 7. Cómo verificar

```bash
php artisan migrate:fresh --seed   # MySQL local (o con DB_CONNECTION=sqlite)
php artisan test --compact         # tests feature (SQLite en memoria)
```

Los tests relevantes: `tests/Feature/PedidoMesaTest.php` (pedido por
mesa, regla de 1 activo, exclusiones/agregados, liberar mesa) y
`tests/Feature/PermisoMiddlewareTest.php` (autorización por
ROL_PERMISO).
