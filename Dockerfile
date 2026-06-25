# syntax=docker/dockerfile:1.7

FROM library/node:22-alpine as builder
ARG BUILD_ENV=prod
WORKDIR /app
COPY package*.json ./
RUN --mount=type=secret,id=npmrc,dst=/app/.npmrc npm install
COPY . .
RUN npm run build:${BUILD_ENV}

FROM nginx:alpine
COPY nginx.conf /etc/nginx/nginx.conf
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]