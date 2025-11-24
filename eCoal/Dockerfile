FROM oven/bun:1.3.0-alpine AS base

WORKDIR /app

RUN apk add --no-cache \
    curl \
    jq \
    tzdata \
    && rm -rf /var/cache/apk/*

COPY package.json bun.lock* ./

RUN bun install --production --no-save

COPY src/ ./src/
COPY run.sh ./

RUN chmod +x run.sh

EXPOSE 3000

LABEL \
    io.hass.name="eCoal Furnace Controller" \
    io.hass.description="Home Assistant addon for eCoal furnace controller integration via MQTT" \
    io.hass.arch="aarch64|i386|amd64" \
    io.hass.type="addon" \
    io.hass.version="1.0.1"

CMD ["./run.sh"]
