FROM node:22-bookworm-slim AS build

WORKDIR /src
RUN npm install -g @swc/cli@0.6.2 @swc/core@1.11.24

COPY .swcrc ./
COPY plugins/password ./plugins/password
COPY server/utils/password.ts ./server/utils/password.ts

# Minimal stubs so SWC path rewriting has a stable baseUrl tree.
RUN mkdir -p server shared app build/server/utils \
  && npx swc ./plugins/password/server -d ./build/plugins --strip-leading-paths --extensions .ts,.tsx --quiet \
  && npx swc ./server/utils/password.ts -o ./build/server/utils/password.js --quiet \
  && mkdir -p ./build/plugins/password \
  && cp ./plugins/password/plugin.json ./build/plugins/password/plugin.json \
  && test -f ./build/plugins/password/server/index.js \
  && test -f ./build/server/utils/password.js

FROM outlinewiki/outline:1.10.1

USER root
COPY --from=build /src/build/plugins/password /opt/outline/build/plugins/password
COPY --from=build /src/build/server/utils/password.js /opt/outline/build/server/utils/password.js
COPY deploy/password-overlay/patch.js /tmp/patch-password.js
RUN node /tmp/patch-password.js \
  && rm /tmp/patch-password.js \
  && chown -R nodejs:nodejs /opt/outline/build/plugins/password /opt/outline/build/server/utils/password.js

USER nodejs
