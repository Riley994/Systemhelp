# TEAM IQ website — production image
# Serves the static site from ./site and handles the form endpoints.
# No dependencies to install: the server uses only the Node standard library.
FROM node:22-alpine

WORKDIR /app

# Every directory the server touches must be copied, at the same relative paths
# as in the repository, because server.mjs imports across directories:
#
#   /app/server/server.mjs   imports   ../shared/lead-delivery.js
#
# Omitting shared/ produces ERR_MODULE_NOT_FOUND at startup and the container
# exits with code 1. That is the failure this file previously caused.
COPY server/ ./server/
COPY shared/ ./shared/
COPY site/   ./site/

# Fail the build rather than the running container if an import is missing.
RUN node --input-type=module -e "\
  const m = await import('/app/shared/lead-delivery.js'); \
  if (typeof m.deliverLead !== 'function') throw new Error('deliverLead is not exported'); \
  console.log('shared module OK');"

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/server.mjs"]