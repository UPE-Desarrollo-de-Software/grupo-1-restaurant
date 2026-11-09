FROM php:8.3-apache

# 1. Instalar dependencias del sistema, librerías PHP y Supervisor
RUN apt-get update && apt-get install -y \
    git unzip libzip-dev libonig-dev libpq-dev supervisor \
    && docker-php-ext-install pdo_pgsql pdo_mysql mbstring bcmath zip pcntl \
    && a2enmod rewrite proxy proxy_wstunnel proxy_http \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# 2. Configurar Apache para servir desde public/
RUN sed -ri \
    's!/var/www/html!/var/www/html/public!g' \
    /etc/apache2/sites-available/000-default.conf

# 3. Configurar Apache para el puerto 10000 de Render
RUN sed -i 's/Listen 80/Listen 10000/' /etc/apache2/ports.conf \
    && sed -i 's/<VirtualHost \*:80>/<VirtualHost *:10000>/' \
    /etc/apache2/sites-available/000-default.conf

# 4. Reglas de Laravel
RUN printf '<Directory /var/www/html/public>\n\
    AllowOverride All\n\
    Require all granted\n\
</Directory>\n' > /etc/apache2/conf-available/laravel.conf \
    && a2enconf laravel

# 4b. Reverse proxy a Reverb (puerto interno 8080). Va dentro del VirtualHost: las reglas
#     del config global no se aplican al sitio. Solo se deriva /app/, que es la ruta de los
#     websockets; el resto (incluida /api) lo sigue atendiendo Laravel. Laravel publica los
#     eventos directo en 127.0.0.1:8080, así que /apps no se expone.
RUN sed -i 's#</VirtualHost>#\tProxyPass /app/ http://127.0.0.1:8080/app/ upgrade=websocket\n\tProxyPassReverse /app/ http://127.0.0.1:8080/app/\n</VirtualHost>#' \
    /etc/apache2/sites-available/000-default.conf

# 5. Copiar código fuente
COPY . .

# 6. Instalar dependencias de PHP con Composer
RUN composer install \
    --no-dev \
    --no-interaction \
    --prefer-dist \
    --optimize-autoloader

# 7. Crear directorios necesarios y asignar permisos
RUN mkdir -p storage/framework/cache \
    storage/framework/sessions \
    storage/framework/views \
    bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

# 8. Copiar configuración de Supervisor
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 10000

# 9. Preparar la base (tablas que falten y datos iniciales si está vacía) y después
#    iniciar Supervisor, que gestiona Apache, Reverb y el Queue Worker
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh
CMD ["./docker-entrypoint.sh"]
