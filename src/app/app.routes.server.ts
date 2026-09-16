import { RenderMode, ServerRoute } from '@angular/ssr';

// The home page is prerendered so a reader that runs no JavaScript (search engines, link previews,
// automated site reviews) gets its heading and explanation as HTML. The ticker data itself loads in
// the browser. Anything else is client-rendered from index.csr.html (see nginx.conf).
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Client },
];
