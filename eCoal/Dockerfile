FROM node:24-alpine AS base

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY src/ ./src/
COPY run.sh ./

RUN chmod +x run.sh

EXPOSE 3000

LABEL \
    io.hass.name="eCoal Furnace Controller" \
    io.hass.description="Home Assistant addon for eCoal furnace controller integration via MQTT" \
    io.hass.arch="aarch64|i386|amd64" \
    io.hass.type="addon" \
    io.hass.version="1.0.8"

CMD ["./run.sh"]
