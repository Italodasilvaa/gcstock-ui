# Imagem do front-end (Angular) servida pelo nginx. O ambiente (API de produção ou de homologação) é escolhido
# no build: --build-arg BUILD_CONFIGURATION=production | staging.
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG BUILD_CONFIGURATION=production
RUN npx ng build --configuration ${BUILD_CONFIGURATION}

FROM nginxinc/nginx-unprivileged:1.27-alpine AS final
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/gcstock-ui/browser /usr/share/nginx/html
EXPOSE 8080
