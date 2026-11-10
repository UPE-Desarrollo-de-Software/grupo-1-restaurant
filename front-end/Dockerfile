# Imagen de producción del frontend (despliegue en Dokploy: ver docker-compose.dokploy.yml).
# En desarrollo no se usa: ahí corre `npm run dev` (Dockerfile.dev).
#
# Dos etapas:
#   1. build   - instala dependencias y genera dist/ con las variables VITE_* del ambiente.
#   2. runtime - nginx sirve dist/ y reenvía /api/ y los websockets (/app/) a la API por la
#                red interna del compose. Así la app vive en un solo dominio: sin CORS.

FROM node:22-alpine AS build
WORKDIR /app

# Vite las embebe en el build: cambian por ambiente, por eso llegan como build args.
ARG VITE_API_URL=/api
ARG VITE_REVERB_APP_KEY=
ARG VITE_REVERB_HOST=
ARG VITE_REVERB_PORT=443
ARG VITE_REVERB_SCHEME=https
ENV VITE_API_URL=$VITE_API_URL \
    VITE_REVERB_APP_KEY=$VITE_REVERB_APP_KEY \
    VITE_REVERB_HOST=$VITE_REVERB_HOST \
    VITE_REVERB_PORT=$VITE_REVERB_PORT \
    VITE_REVERB_SCHEME=$VITE_REVERB_SCHEME

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
# Host y puerto de la API dentro de la red del compose. La imagen oficial de nginx reemplaza
# ${API_UPSTREAM} en los archivos de templates/ al arrancar.
ENV API_UPSTREAM=resto-api-interno:10000
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
