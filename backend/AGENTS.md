# AGENTS.md

API REST de un restaurante (proyecto final). Laravel 13 + Sanctum. Este repo es **solo el backend**: no hay front-end (el front consume `/api/*`); `../documentacion` (DER, historias de usuario, minutas) queda fuera del repo.

## Comandos

- `composer run dev` → `php artisan dev` (serve + queue + vite). Requiere `npm install` antes: `node_modules/` no está commiteado y hoy no existe.
- `php artisan test --compact` → corre sobre **SQLite en memoria** (`phpunit.xml`), no necesita MySQL. Un archivo: `php artisan test --compact tests/Feature/XTest.php`; un caso: `--filter='...'` (o `vendor/bin/pest <path>`).
- `vendor/bin/pint --dirty --format agent` tras tocar cualquier PHP (no hay `pint.json` → preset `laravel`).
  - **Ojo mientras el repo no tenga commits**: sin `HEAD`, `--dirty` evalúa todo el codebase y reformatea los ~31 PHP que no cumplen el preset. Para limitarlo a lo tuyo: `vendor/bin/pint <ruta>`.
- Setup desde cero: `composer run setup`. Seed: `php artisan db:seed` (permisos + roles + usuarios `gerente@restaurant.com` y un mozo, password `123456`, + la CONFIG_MESA base 25×4 = aforo 100; **no se precrean mesas**: son dinámicas contra el aforo). Si MySQL está caído, validar migraciones+seed con `DB_CONNECTION=sqlite DB_DATABASE=:memory: php artisan migrate:fresh --seed`.

## Entorno

- `.env` apunta a MySQL `gastro_app` (root, sin password) y **MySQL no siempre está corriendo**: `SQLSTATE[HY000] [2002] connection refused` es el server caído, no un bug de la app.
- `storage/logs/laravel.log` (gitignored) guarda los stack traces reales de los 500 locales.
- `CLAUDE.md` es el stub de bootstrap de Boost (`composer require laravel/boost`…): Boost ya está instalado y `AGENTS.md` es el archivo vivo de instrucciones.
- El bloque de guidelines de Boost que sigue más abajo se **regenera en cada `composer update`** (`boost:update` corre en `post-update-cmd`) y solo se reemplaza lo que está entre sus etiquetas. No editar ese bloque: las notas del repo van fuera de él.
- Skills del proyecto en `.agents/skills/` (`laravel-best-practices`, `testing-best-practices`, `tailwindcss-development`, `infer-conventions`).
- El MCP de Boost **no está cableado para OpenCode** en este repo (no hay `opencode.json` ni `mcp.json`; `boost.json` solo lista al agente `codex`): usá `php artisan` y lectura de archivos en su lugar.

## Arquitectura

- **Hexagonal (rebote 2, oct. 2026)**: `routes/api.php` → Controller (valida con `$request->validate`, arma el JSON y catchea `\Exception` de negocio → 422) → `app/UseCases/<Modulo>/` (62 casos, uno por endpoint; incluye el módulo de `Reservas` y de `Reportes`) → `app/Services/*` (reglas de negocio) → `app/Repositories/*` (interfaz puerto + `Eloquent*Repository`, binding en `AppServiceProvider`). Detalle de cada patrón (cómo, cuándo, por qué) en `../documentacion/PATRONES-backend.md`. **No hay** FormRequests, Policies ni API Resources: no introducirlos sin preguntar.
- El modelo sigue el **DER v2.2** (`../documentacion/DER-v2.2-cambios.md`: 15 entidades / 15 relaciones; el dibujo del grupo está en `DER-v3.0.dio`; mapeo en `../documentacion/DER-v2.2-backend.md`): sin entidad CLIENTE ni SESION (borradas), mesas dinámicas con aforo (`CONFIG_MESA`: aforo = Σ capacidad×cantidad, tope de mesas = Σ cantidad; la pila `PARAMETRO` se borró) y borrado lógico (`SoftDeletes`), `codigo_acceso` estable (6 dígitos UNIQUE, no se regenera), pedidos con relación unitaria `PEDIDO–PEDIDO` (`pedido_padre_id`, profundidad 2) y **varios pedidos activos por mesa**. Gate del auto-pedido = `detalle_pedidos.confirmado`.
- El comensal **no tiene usuario ni token**: `POST /api/acceso {codigo}` (público) y luego `Authorization: Bearer <codigo_acceso>` en `/cliente/*`. `ClienteMiddleware` resuelve la mesa viva y la guarda en `$request->attributes['cliente_mesa']` (401 sin Bearer/mesa destruida; 403 si el Bearer es un token Sanctum, que contiene `|`). La identidad del comensal es el pedido que creó (ids en el localStorage del front). `$request->user()` solo devuelve `Usuario` (empleados).
- Autorización por **permisos**, no por string del rol: middleware alias `permiso` (`TienePermiso`) consulta `ROL_PERMISO` (`permiso:tomar_pedidos`, `permiso:gestionar_mesas`, etc.). Los aliases `gerente` / `mozo` no existen más.
- Errores de dominio con estado: `app/Exceptions/ApiException{status}` con renderable en `bootstrap/app.php` (401/403/429 sin try/catch por controller). Reglas de negocio genéricas: `\Exception` catcheada en el controller → 422. Binding/`OrFail` → 404.
- Leer `routes/api.php` antes de agregar rutas (está comentado por grupos de permiso).

## Convenciones que difieren de Laravel

- Columnas en **camelCase** (nombre exacto del DER, no normalizar): solo queda `precioAdicional` (ingredientes). Todo lo demás es snake_case.
- Tablas mixtas: `rol` y `rol_permiso` (singulares), `usuarios`, `platos`, `categorias`, `mesas`, `pedidos`, `detalle_pedidos`, `detalle_pedido_ingrediente` (la entidad DER `DETALLE_INGREDIENTE`) y `parametros` (pila clave/valor).
- Estados como strings: `mesas.estado = libre|ocupada|reservada`, `pedidos.estado = en_curso|confirmado|enviado|en_preparacion|entregado|cerrado|cancelado` (el flujo vive en `PedidoService::cambiarEstado`). `confirmado` (estado de PEDIDO) es el paso previo a `enviar`; `confirmado` (boolean de DETALLE_PEDIDO) es el gate de cada línea.
- Errores esperados: `throw new ApiException($status, $message)` (renderable en `bootstrap/app.php`); reglas de negocio con `\Exception` → controller catch → 422; "no encontrado" de mesa = `ModelNotFoundException` vía binding/`OrFail`.
- El case del namespace debe coincidir con la ruta: `App\Http\Controllers`, `App\Models\...`. PSR-4 es case-sensitive: un path mal cased anda en Windows pero falla en Linux.
- Mensajes al usuario en español (voseo: "No tenes permisos…"); los identificadores quedan como están.
- Los "no encontrado" suelen devolver 200 + `{"message": ...}` en vez de 404: seguir al controller hermano (`IngredienteController` es el único que 404ea).

## Trampas verificadas (no copiar estos patrones)

- El binding implícito matchea por nombre de parámetro: la ruta declara `{id}` y el método tipa `$mesa` → `SubstituteBindings` saltea y el container inyecta un modelo vacío. Al tocar rutas, renombrar la ruta o el parámetro juntos. Por eso cuenta/show/destroy de mesa usan `string $id` + `porIdOrFail`/`conTrashedOrFail` en vez de binding implícito (hay que distinguir 404 de soft-delete).
- Borrar una `categoria` con platos falla con FK 1451 (no hay cascade en `platos.categoria_id`); el controller lo catchea y responde 422.
- El guard `auth:sanctum` (RequestGuard) **cachea el user resuelto durante todo el test**: para cambiar de identidad entre empleados hay que llamar `app('auth')->forgetGuards()` antes del siguiente request (los helpers `conMozo`/`conEmpleado` de los tests lo hacen). Usar `app('auth')`, no `auth()`: el helper está tipado con el contract `Factory`, que no declara `forgetGuards()` (el IDE lo marca como error pese a que en runtime anda).
- Los helpers de Pest que usan `$this->withHeader('Authorization', …)` comparten el TestCase: llamar `conMozo`/`conEmpleado` **justo antes** de cada request con identidad distinta, si no el header anterior persiste.
- Helpers globales de Pest (definidos en un archivo, visibles en todos): `autenticarMozo`/`platoDePrueba` (PedidoMesaTest), `mesaVisita`/`platoAuto`/`tokenMozo`/`conMozo`/`comensal`/`pedirLineaCliente` (ClientePedidoTest), `tokenEmpleado`/`conEmpleado`/`fijarAforo` (MesaDinamicaTest), `tokenReporte`/`conReporte` (DashboardTest). **No redeclararlos** en otro archivo (fatal error); elegir nombres propios.
- `MesaFactory::codigo_acceso` debe generar **string**: la validación `size:6` rechaza un int.
- Las mesas destruidas (SoftDeletes) no se ven en listados ni valen para `/acceso`, pero **sí** en `codigoExiste()` (evita reusar códigos) y en la cuenta histórica (`conTrashedOrFail`). Cualquier consulta nueva debe decidir el alcance a propósito.
- El Bearer del comensal **no** es un token Sanctum: `ClienteMiddleware` rechaza con 403 cualquier Bearer que contenga `|` (formato de los tokens de empleado). No usar `Sanctum::actingAs` para simular un comensal.

## Testing

- Suite actual: `php artisan test --compact` → **92 tests / 482 assertions, verde** (SQLite en memoria). Cubre platos, ingredientes, categorías, mesas dinámicas, configuración (`ConfigMesaTest`, 7 tests), pedidos, cliente, permisos, promociones (`PromocionTest`, 18 tests), reservas (`ReservaTest`, 15 tests), dashboard (`DashboardTest`, 8 tests) e historial de comandas (`HistorialComandaTest`, 9 tests). `tests/Pest.php` no habilita `RefreshDatabase` globalmente: cada test que toca la DB lo pide con `uses(RefreshDatabase::class);` arriba del archivo (ver `tests/Feature/PedidoMesaTest.php`).
- Tests feature con Pest. Factories: `Usuario`, `Rol`, `Mesa`, `Categoria`, `Plato`, `Ingrediente` (`database/factories/`). **Sin factory de pedidos ni de CONFIG_MESA**: crear pedidos por API/`PedidoService` y fijar la composición del salón con los helpers `fijarAforo()` (MesaDinamicaTest), `aforoReserva()` (ReservaTest) o `fijarConfig()` (ConfigMesaTest).
- Ignorar `App\Models\User`, la migración `users` y el provider de `config/auth.php`: son defaults de Laravel; la app autentica `Usuario` con tokens Sanctum (el comensal no autentica: usa el Bearer de `codigo_acceso`).

---

<laravel-boost-guidelines>
=== foundation rules ===

# Laravel Boost Guidelines

The Laravel Boost guidelines are specifically curated by Laravel maintainers for this application. These guidelines should be followed closely to ensure the best experience when building Laravel applications.

## Foundational Context

This application is a Laravel application running on PHP 8.3. You are an expert with the Laravel ecosystem. Always use the APIs that match the installed major version of each package — do not assume a version.

Before relying on a package's API, confirm its installed version:
- PHP packages: run `composer show --direct` to list direct dependencies with versions, or `composer show <vendor/package>` for a single package.
- JS packages: check `package.json` for the installed versions.

## Skills Activation

This project has domain-specific skills available in `**/skills/**`. You MUST activate the relevant skill whenever you work in that domain—don't wait until you're stuck.

## Conventions

- You must follow all existing code conventions used in this application. When creating or editing a file, check sibling files for the correct structure, approach, and naming.
- Use descriptive names for variables and methods. For example, `isRegisteredForDiscounts`, not `discount()`.
- Check for existing components to reuse before writing a new one.

## Verification Scripts

- Do not create verification scripts or tinker when tests cover that functionality and prove they work. Unit and feature tests are more important.

## Application Structure & Architecture

- Stick to existing directory structure; don't create new base folders without approval.
- Do not change the application's dependencies without approval.

## Frontend Bundling

- If the user doesn't see a frontend change reflected in the UI, it could mean they need to run `npm run build`, `npm run dev`, or `composer run dev`. Ask them.

## Documentation Files

- You must only create documentation files if explicitly requested by the user.

## Replies

- Be concise in your explanations - focus on what's important rather than explaining obvious details.

=== boost rules ===

# Laravel Boost

## Tools

- Laravel Boost is an MCP server with tools designed specifically for this application. Prefer Boost tools over manual alternatives like shell commands or file reads.
- Use `database-query` to run read-only queries against the database instead of writing raw SQL in tinker.
- Use `database-schema` to inspect table structure before writing migrations or models.
- Use `get-absolute-url` to resolve the correct scheme, domain, and port for project URLs. Always use this before sharing a URL with the user.
- Use `browser-logs` to read browser logs, errors, and exceptions. Only recent logs are useful, ignore old entries.

## Searching Documentation (IMPORTANT)

- Use `search-docs` before changes that depend on Laravel ecosystem APIs, behavior, configuration, or version-specific syntax. Skip it for copy-only edits and other changes where package documentation is irrelevant. Reuse sufficient results already in context instead of searching again.
- Pass a `packages` array to scope results when you know which packages are relevant.
- Use multiple broad, topic-based queries: `['rate limiting', 'routing rate limiting', 'routing']`. Expect the most relevant results first.
- Do not add package names to queries because package info is already shared. Use `test resource table`, not `filament 4 test resource table`.

### Search Syntax

1. Use words for auto-stemmed AND logic: `rate limit` matches both "rate" AND "limit".
2. Use `"quoted phrases"` for exact position matching: `"infinite scroll"` requires adjacent words in order.
3. Combine words and phrases for mixed queries: `middleware "rate limit"`.
4. Use multiple queries for OR logic: `queries=["authentication", "middleware"]`.

## Project Rules

- This project contains committed, area-grouped rules in `.ai/rules` when that directory exists (settled decisions, non-obvious traps, standing constraints). Framework and package guidelines that only apply to specific paths (testing, frontend, components) also live there, under `.ai/rules/boost` — this is not just recorded decisions, it is load-bearing guidance you have not seen inline. Before you enter plan mode or create/edit any file, you MUST first: open @.ai/rules/index.md (it maps file globs to rule files), read every rule file whose globs cover the path(s) in scope, and run `grep -rin 'keyword' .ai/rules` to catch what a path match alone misses. Do not write code until you have read and are following every matching rule. If `.ai/rules` does not exist, continue without it.
- Record a rule with `record-rule` only when the user explicitly asks for one. Instructions for the work at hand are not rules, no matter how emphatic: "remove this typo", "use X here" are work to do, not rules to record. Never record a rule on your own initiative, as a byproduct of a change, or to summarize what you just did. When the user does ask, pass a `glob` (e.g. `app/Http/Controllers/**`), a short `title`, and a few-line `note`. Use `record-rule` rather than your native memory or notes tool, because native memory is personal and session-scoped, while only `.ai/rules` is shared with the team and persists in the repo.

## Artisan

- Run Artisan commands directly via the command line (e.g., `php artisan route:list`). Use `php artisan list` to discover available commands and `php artisan [command] --help` to check parameters.
- Inspect routes with `php artisan route:list`. Filter with: `--method=GET`, `--name=users`, `--path=api`, `--except-vendor`, `--only-vendor`.
- Read configuration values using dot notation: `php artisan config:show app.name`, `php artisan config:show database.default`. Or read config files directly from the `config/` directory.

## Tinker

- Execute PHP in app context for debugging and testing code. Do not create models without user approval, prefer tests with factories instead. Prefer existing Artisan commands over custom tinker code.
- Always use single quotes to prevent shell expansion: `php artisan tinker --execute 'Your::code();'`
  - Double quotes for PHP strings inside: `php artisan tinker --execute 'User::where("active", true)->count();'`

=== php rules ===

# PHP

- Always use curly braces for control structures, even for single-line bodies.
- Use PHP 8 constructor property promotion: `public function __construct(public GitHub $github) { }`. Do not leave empty zero-parameter `__construct()` methods unless the constructor is private.
- Use explicit return type declarations and type hints for all method parameters: `function isAccessible(User $user, ?string $path = null): bool`
- Use TitleCase for Enum keys: `FavoritePerson`, `BestLake`, `Monthly`.
- Prefer PHPDoc blocks over inline comments. Only add inline comments for exceptionally complex logic.
- Use array shape type definitions in PHPDoc blocks.

=== deployments rules ===

# Deployment

- Laravel can be deployed using [Laravel Cloud](https://cloud.laravel.com/), which is the fastest way to deploy and scale production Laravel applications.
- Activate the `deploying-to-cloud` skill whenever deploying to Laravel Cloud, configuring Cloud environments or resources, using the Cloud CLI, or troubleshooting Cloud deployments.

=== laravel/core rules ===

# Do Things the Laravel Way

- Use `php artisan make:` commands to create new files (i.e. migrations, controllers, models, etc.). You can list available Artisan commands using `php artisan list` and check their parameters with `php artisan [command] --help`.
- If you're creating a generic PHP class, use `php artisan make:class`.
- Pass `--no-interaction` to all Artisan commands to ensure they work without user input. You should also pass the correct `--options` to ensure correct behavior.

### Model Creation

- When creating new models, create useful factories and seeders for them too. Ask the user if they need any other things, using `php artisan make:model --help` to check the available options.

## APIs & Eloquent Resources

- For APIs, default to using Eloquent API Resources and API versioning unless existing API routes do not, then you should follow existing application convention.

## URL Generation

- When generating links to other pages, prefer named routes and the `route()` function.

## Testing

- When creating models for tests, use the factories for the models. Check if the factory has custom states that can be used before manually setting up the model.
- Faker: Use methods such as `$this->faker->word()` or `fake()->randomDigit()`. Follow existing conventions whether to use `$this->faker` or `fake()`.
- When creating tests, make use of `php artisan make:test [options] {name}` to create a feature test, and pass `--unit` to create a unit test. Most tests should be feature tests.

## Vite Error

- If you receive an "Illuminate\Foundation\ViteException: Unable to locate file in Vite manifest" error, you can run `npm run build` or ask the user to run `npm run dev` or `composer run dev`.

=== pint/core rules ===

# Laravel Pint Code Formatter

- If you have modified any PHP files, you must run `vendor/bin/pint --dirty --format agent` before finalizing changes to ensure your code matches the project's expected style.
- Do not run `vendor/bin/pint --test --format agent`, simply run `vendor/bin/pint --format agent` to fix any formatting issues.

=== pest/core rules ===

# Pest

- This project uses Pest. Create tests with `php artisan make:test --pest {name}`.
- Do not include the test suite directory in `{name}`. Use `SomeFeatureTest`, not `Feature/SomeFeatureTest`.
- Read the `testing-best-practices` skill for guidance on coverage, naming, structure, dependency isolation, and review.
- Do not delete tests or test files without approval. They are part of the application.

## Running Tests

- Run the narrowest set of tests that covers the change. Pass a file path or `--filter=testName` to `php artisan test --compact`.
- Rerun a test after each change to it.
- Run `vendor/bin/pest` to call the test runner directly. It accepts the same file path and `--filter=testName` arguments.
- After the feature tests pass, ask the user to run the complete suite with `php artisan test --compact`.

</laravel-boost-guidelines>
