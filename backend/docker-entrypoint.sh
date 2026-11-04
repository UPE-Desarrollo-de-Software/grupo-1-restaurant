#!/bin/sh
# Arranque del contenedor del backend.
# 1. Espera a que la base acepte conexiones.
# 2. Prepara la base: crea las tablas que falten y, si está vacía, carga los datos iniciales.
# 3. Cachea la configuración y levanta Apache.
set -e

intentos=30
n=1
until php artisan app:preparar-base; do
    if [ "$n" -ge "$intentos" ]; then
        echo "No se pudo preparar la base después de $intentos intentos." >&2
        exit 1
    fi
    echo "La base todavía no está lista ($n/$intentos). Reintento en 3 segundos..." >&2
    n=$((n + 1))
    sleep 3
done

php artisan config:cache
php artisan route:cache
# Los comandos anteriores corren como root: Apache (www-data) tiene que poder escribir logs y caché
chown -R www-data:www-data storage bootstrap/cache

exec apache2-foreground
