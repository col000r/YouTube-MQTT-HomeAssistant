ARG BUILD_FROM
FROM $BUILD_FROM

# Install Node.js and jq for JSON parsing
RUN apk add --no-cache nodejs npm jq

# Set shell
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Copy root filesystem
COPY rootfs /

# Copy application source
WORKDIR /app
COPY package*.json tsconfig.json ./
COPY src ./src

# Install dependencies and build
RUN npm ci && \
    npm run build && \
    npm prune --production && \
    rm -rf src tsconfig.json

# Labels
LABEL \
    io.hass.name="YouTube Channel Monitor" \
    io.hass.description="Monitor YouTube channel statistics" \
    io.hass.type="addon" \
    io.hass.version="1.0.1" \
    maintainer="Your Name <your.email@example.com>"

# Start script
RUN chmod a+x /run.sh
CMD [ "/run.sh" ]