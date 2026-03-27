# ---- Giai đoạn 1: Build app ----
FROM node:20-alpine AS build
WORKDIR /app

# Cài dependencies
COPY package*.json ./
RUN npm ci

# Copy toàn bộ source và build
COPY . .
RUN npm run build

# ---- Giai đoạn 2: Serve bằng Nginx ----
FROM nginx:alpine

# Copy file build vào Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copy file config nginx (nếu có)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
