 FROM node:22-alpine

RUN npm i -g pnpm 

WORKDIR  /usr/src/app

COPY ./packages ./packages

COPY ./pnpm-lock.yaml ./pnpm-lock.yaml

COPY ./package.json  ./package.json

COPY ./turbo.json  ./turbo.json

COPY ./apps/ws  ./apps/ws 

RUN pnpm install


RUN pnpm run generate:db

EXPOSE 8080

CMD ["pnpm", "run","start:ws"]