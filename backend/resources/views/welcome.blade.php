<!DOCTYPE html>
<html lang="es">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title>API Restaurante — Documentación</title>

        <style>
            :root {
                --bg: #f4f5f7;
                --surface: #ffffff;
                --border: #e5e7eb;
                --text: #16181d;
                --muted: #6b7280;
                --mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
            }

            * {
                box-sizing: border-box;
            }

            body {
                margin: 0;
                background: var(--bg);
                color: var(--text);
                font-family: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                font-size: 15px;
                line-height: 1.55;
            }

            .wrap {
                max-width: 960px;
                margin: 0 auto;
                padding: 48px 20px 64px;
            }

            /* ---------- encabezado ---------- */

            .eyebrow {
                margin: 0 0 6px;
                font-size: 12px;
                font-weight: 600;
                letter-spacing: .08em;
                text-transform: uppercase;
                color: var(--muted);
            }

            h1 {
                margin: 0;
                font-size: 30px;
                font-weight: 700;
                letter-spacing: -.02em;
            }

            .lead {
                margin: 8px 0 0;
                color: var(--muted);
                max-width: 62ch;
            }

            .base {
                display: inline-block;
                margin: 16px 0 0;
                padding: 6px 10px;
                background: var(--surface);
                border: 1px solid var(--border);
                border-radius: 8px;
                font-size: 13px;
                color: var(--muted);
            }

            .base code {
                font-family: var(--mono);
                color: var(--text);
            }

            /* ---------- índice ---------- */

            .indice {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin: 24px 0 0;
                padding: 0;
                list-style: none;
            }

            .indice a {
                display: inline-block;
                padding: 4px 10px;
                background: var(--surface);
                border: 1px solid var(--border);
                border-radius: 999px;
                font-size: 13px;
                color: var(--muted);
                text-decoration: none;
            }

            .indice a:hover {
                border-color: #c7cbd1;
                color: var(--text);
            }

            /* ---------- tarjetas ---------- */

            .card {
                margin-top: 24px;
                background: var(--surface);
                border: 1px solid var(--border);
                border-radius: 12px;
                padding: 20px 22px;
            }

            .card h2 {
                margin: 0 0 10px;
                font-size: 16px;
                font-weight: 650;
            }

            .card p {
                margin: 0 0 8px;
                color: var(--muted);
                font-size: 14px;
            }

            .card p:last-child {
                margin-bottom: 0;
            }

            .card code {
                font-family: var(--mono);
                font-size: 13px;
                padding: 1px 5px;
                background: #f3f4f6;
                border-radius: 4px;
                color: var(--text);
            }

            .leyenda {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 14px;
            }

            /* ---------- grupos de endpoints ---------- */

            .grupo {
                margin-top: 32px;
            }

            .grupo h2 {
                display: flex;
                align-items: center;
                gap: 8px;
                margin: 0 0 10px;
                font-size: 17px;
                font-weight: 650;
                letter-spacing: -.01em;
            }

            .contador {
                padding: 1px 8px;
                background: #e9eaee;
                border-radius: 999px;
                font-size: 12px;
                font-weight: 600;
                color: var(--muted);
            }

            .lista {
                margin: 0;
                padding: 0;
                list-style: none;
                background: var(--surface);
                border: 1px solid var(--border);
                border-radius: 12px;
                overflow: hidden;
            }

            .endpoint {
                display: flex;
                flex-wrap: wrap;
                align-items: baseline;
                gap: 12px;
                padding: 13px 16px;
                border-top: 1px solid var(--border);
            }

            .lista li:first-child .endpoint,
            .lista .endpoint:first-child {
                border-top: 0;
            }

            .endpoint:hover {
                background: #fafbfc;
            }

            .ep-main {
                flex: 1 1 320px;
                display: flex;
                flex-direction: column;
                gap: 3px;
                min-width: 0;
            }

            .ruta {
                font-family: var(--mono);
                font-size: 14px;
                font-weight: 500;
                word-break: break-all;
            }

            .desc {
                font-size: 13px;
                color: var(--muted);
            }

            .pendiente {
                color: #9ca3af;
                font-style: italic;
            }

            /* ---------- badges ---------- */

            .metodo {
                flex: 0 0 64px;
                display: inline-block;
                padding: 2px 0;
                border-radius: 5px;
                font-family: var(--mono);
                font-size: 11px;
                font-weight: 700;
                letter-spacing: .04em;
                text-align: center;
            }

            .metodo-get {
                background: #dcfce7;
                color: #0f7b3f;
            }

            .metodo-post {
                background: #dbeafe;
                color: #1d4ed8;
            }

            .metodo-put,
            .metodo-patch {
                background: #fef3c7;
                color: #b45309;
            }

            .metodo-delete {
                background: #fee2e2;
                color: #b91c1c;
            }

            .acceso {
                margin-left: auto;
                display: inline-block;
                padding: 2px 9px;
                border-radius: 999px;
                border: 1px solid transparent;
                font-size: 11px;
                font-weight: 600;
                white-space: nowrap;
            }

            .acceso-publico {
                background: #f3f4f6;
                border-color: var(--border);
                color: var(--muted);
            }

            .acceso-empleado {
                background: #dbeafe;
                color: #1d4ed8;
            }

            .acceso-cliente {
                background: #ede9fe;
                color: #6d28d9;
            }

            .acceso-mozo {
                background: #fef3c7;
                color: #b45309;
            }

            .acceso-gerente {
                background: #fee2e2;
                color: #b91c1c;
            }

            /* ---------- pie ---------- */

            footer {
                margin-top: 40px;
                padding-top: 16px;
                border-top: 1px solid var(--border);
                font-size: 13px;
                color: var(--muted);
            }

            footer code {
                font-family: var(--mono);
            }

            @media (max-width: 560px) {
                .wrap {
                    padding: 32px 14px 48px;
                }

                h1 {
                    font-size: 24px;
                }

                .acceso {
                    margin-left: 0;
                }
            }
        </style>
    </head>

    <body>
        <div class="wrap">
            <header>
                <p class="eyebrow">Backend · Laravel + Sanctum</p>
                <h1>API Restaurante</h1>
                <p class="lead">
                    Documentación de los endpoints expuestos por el backend. El front los consume
                    con <code>fetch</code> contra la URL base de abajo.
                </p>
                <p class="base">URL base: <code>{{ $baseUrl }}</code></p>
            </header>

            <nav>
                <ul class="indice">
                    @foreach ($secciones as $seccion)
                        <li>
                            <a href="#{{ \Illuminate\Support\Str::slug($seccion['titulo']) }}">
                                {{ $seccion['titulo'] }}
                            </a>
                        </li>
                    @endforeach
                </ul>
            </nav>

            <section class="card">
                <h2>Autenticación</h2>
                <p>
                    Las rutas protegidas se llaman enviando el header
                    <code>Authorization: Bearer {token}</code>. Hay dos tipos de token:
                </p>
                <p>
                    <strong>Empleado</strong>: <code>POST /api/login</code> con <code>email</code> y
                    <code>password</code> → responde un token de <code>Usuario</code> (roles
                    Gerente / Mozo).
                </p>
                <p>
                    <strong>Cliente</strong>: <code>POST /api/login-cliente</code> con el
                    <code>codigoGrupal</code> de 4 dígitos que reparte el mozo → responde un token de
                    <code>Cliente</code>, válido mientras la sesión esté activa.
                </p>
                <div class="leyenda">
                    <span class="acceso acceso-publico">Público</span>
                    <span class="acceso acceso-empleado">Empleado</span>
                    <span class="acceso acceso-cliente">Cliente</span>
                    <span class="acceso acceso-mozo">Mozo</span>
                    <span class="acceso acceso-gerente">Gerente</span>
                </div>
            </section>

            <main>
                @foreach ($secciones as $seccion)
                    <section
                        class="grupo"
                        id="{{ \Illuminate\Support\Str::slug($seccion['titulo']) }}"
                    >
                        <h2>
                            {{ $seccion['titulo'] }}
                            <span class="contador">{{ count($seccion['endpoints']) }}</span>
                        </h2>

                        <ul class="lista">
                            @foreach ($seccion['endpoints'] as $endpoint)
                                <li class="endpoint">
                                    <span class="metodo metodo-{{ strtolower($endpoint['metodo']) }}">
                                        {{ $endpoint['metodo'] }}
                                    </span>

                                    <span class="ep-main">
                                        <code class="ruta">{{ $endpoint['uri'] }}</code>

                                        @if ($endpoint['descripcion'])
                                            <span class="desc">{{ $endpoint['descripcion'] }}</span>
                                        @else
                                            <span class="desc pendiente">
                                                {{ $endpoint['accion'] }} — sin descripción
                                            </span>
                                        @endif
                                    </span>

                                    <span class="acceso acceso-{{ $endpoint['accesoClase'] }}">
                                        {{ $endpoint['acceso'] }}
                                    </span>
                                </li>
                            @endforeach
                        </ul>
                    </section>
                @endforeach
            </main>

            <footer>
                Generado desde <code>routes/api.php</code> · {{ $total }} endpoints.
            </footer>
        </div>
    </body>
</html>
