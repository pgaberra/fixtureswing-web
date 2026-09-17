# ---- Build stage ----
FROM node:26-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# The typed api client is generated from the pinned spec (src/app/api is gitignored).
RUN npm run generate:api

# Build-time config, passed by Coolify as --build-arg. Everything here ships to the browser, so all
# of it is public by definition. See .github/scripts/check-build-placeholders.sh.
# APP_ENV: "production" or "staging" (staging shows the version banner and is never indexed).
ARG APP_ENV=production
# APP_VERSION: the release tag, shown on staging and sent to Sentry.
ARG APP_VERSION=
# SENTRY_DSN: browser error reporting; empty disables it.
ARG SENTRY_DSN=
# POSTHOG_KEY: analytics; empty disables it. Staging and production use separate projects.
ARG POSTHOG_KEY=

RUN sed -i \
  -e "s|__APP_ENV__|${APP_ENV}|g" \
  -e "s|__APP_VERSION__|${APP_VERSION}|g" \
  -e "s|__SENTRY_DSN__|${SENTRY_DSN}|g" \
  -e "s|__POSTHOG_KEY__|${POSTHOG_KEY}|g" \
  src/environments/environment.prod.ts

RUN npm run build

# ---- Serve stage ----
FROM nginx:alpine
# ARGs don't cross stages. API_UPSTREAM is the api's address on the private Docker network, which
# nginx proxies /api to; the api itself has no public hostname.
ARG API_UPSTREAM=http://fixtureswing-api:8100
ARG APP_ENV=production
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN if [ "$APP_ENV" = "production" ]; then ROBOTS_TAG=""; else ROBOTS_TAG="noindex"; fi && \
  sed -i -e "s|__API_UPSTREAM__|${API_UPSTREAM}|g" -e "s|__ROBOTS_TAG__|${ROBOTS_TAG}|g" \
  /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/fixtureswing-web/browser /usr/share/nginx/html

# Run nginx as the image's unprivileged `nginx` user, master process included. Docker sets
# ip_unprivileged_port_start=0 in the container's network namespace, so port 80 still binds. A
# non-root master needs a writable pid file and its temp directories under /var/cache/nginx; the
# checks fail the build if a new base image moves those lines.
RUN sed -i -e '/^user /d' -e 's|^pid .*|pid /tmp/nginx.pid;|' /etc/nginx/nginx.conf \
  && ! grep -q '^user ' /etc/nginx/nginx.conf \
  && grep -q '^pid /tmp/nginx.pid;$' /etc/nginx/nginx.conf \
  && chown -R nginx:nginx /var/cache/nginx
USER nginx
EXPOSE 80
