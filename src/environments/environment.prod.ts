// Every deployed build. The Dockerfile substitutes each double-underscore placeholder from a build arg, and
// .github/scripts/check-build-placeholders.sh fails CI if one has no substitution. Everything here
// ships to every visitor, so nothing secret may ever be added.

// Which deployment this bundle is ("staging" shows the version banner) and its release tag.
// Untouched, they resolve to a plain production build with no version label.
const appEnvFlag: string = '__APP_ENV__';
const appVersionFlag: string = '__APP_VERSION__';

// Sentry DSN for browser error reporting. Not a secret: it only permits sending events.
// Untouched or empty disables reporting, and the SDK is never fetched.
const sentryDsnFlag: string = '__SENTRY_DSN__';

// Public PostHog project key. Untouched or empty disables analytics, and posthog-js is never
// fetched. Staging and production use separate PostHog projects.
const posthogKeyFlag: string = '__POSTHOG_KEY__';

export const environment = {
  production: true,
  environmentName:
    appEnvFlag.startsWith('__APP_ENV') || appEnvFlag === '' ? 'production' : appEnvFlag,
  version: appVersionFlag.startsWith('__APP_VERSION') ? '' : appVersionFlag,
  apiRootUrl: '',
  sentryDsn: sentryDsnFlag.startsWith('__SENTRY') ? '' : sentryDsnFlag,
  posthogKey: posthogKeyFlag.startsWith('__POSTHOG') ? '' : posthogKeyFlag,
};
