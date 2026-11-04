FROM php:8.3-apache

# 1. Instalar dependencias del sistema, librerías PHP y Supervisor
RUN apt-get update && apt-get install -y \
    git unzip libzip-dev libonig-dev supervisor \
    && docker-php-ext-install pdo_mysql mbstring bcmath zip \
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

# 4. Reglas de Laravel y Reverse Proxy para Reverb (puerto interno 8080)
RUN printf '<Directory /var/www/html/public>\n\
    AllowOverride All\n\
    Require all granted\n\
</Directory>\n\n\
RewriteEngine On\n\
RewriteCond %%{HTTP:Upgrade} =websocket [NC]\n\
RewriteRule /(.*) ws://127.0.0.1:8080/$1 [P,L]\n\
RewriteCond %%{HTTP:Upgrade} !=websocket [NC]\n\
RewriteRule /(.*) http://127.0.0.1:8080/$1 [P,L]\n' > /etc/apache2/conf-available/laravel.conf \
    && a2enconf laravel

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

# 9. Iniciar el demonio de Supervisor que gestiona Apache, Reverb y Queue Worker
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]