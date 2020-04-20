FROM node:8.11.1-slim AS build
RUN npm install typescript -g && npm install tsoa -g
COPY . /build
ARG NODE_ENV
RUN cd /build &&\
  npm run build || exit 0

FROM node:8.11.1-slim AS nodebuild
COPY --from=build /build/package.json /koalament-api/
WORKDIR /koalament-api
ARG NODE_ENV
RUN npm install --production

FROM node:8.11.1-slim
COPY --from=build /build/package.json /koalament-api/
WORKDIR /koalament-api
ARG NODE_ENV
COPY --from=nodebuild /koalament-api/node_modules /koalament-api/node_modules
COPY --from=build /build/dist /koalament-api
CMD ["node", "--require", "source-map-support/register", "index.js"]
