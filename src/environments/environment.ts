// Local development. `ng serve` proxies /api to the api on localhost:8100 (proxy.conf.json), so
// the app calls its own origin exactly as it does when deployed behind nginx.
export const environment = {
  production: false,
  environmentName: 'local',
  version: '',
  // Same origin everywhere: nginx (deployed) or the dev proxy (local) forwards /api.
  apiRootUrl: '',
  sentryDsn: '',
  posthogKey: '',
};
