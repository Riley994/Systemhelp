# TEAM IQ website — production image
# Serves the static site from /site and handles POST /api/lead.
# No dependencies to install: the server uses only the Node standard library.
FROM node:22-alpine

WORKDIR /app

COPY server/ ./server/
COPY site/ ./site/

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/server.mjs"]