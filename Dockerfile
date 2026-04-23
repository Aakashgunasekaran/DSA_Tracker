FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
# sql.js is pure JS — no native build tools needed
RUN npm install --omit=dev

COPY . .

RUN mkdir -p /app/data

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "server.js"]
