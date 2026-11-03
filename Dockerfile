FROM node:22-alpine
WORKDIR /app
COPY --chown=node:node package.json server.js game.js catalog.js ./
COPY --chown=node:node public ./public
RUN mkdir data && chown node:node data
USER node
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8091
EXPOSE 8091
CMD ["node", "server.js"]
