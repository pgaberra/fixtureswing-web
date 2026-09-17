import { Routes } from '@angular/router';

// Every route is lazy. `title` sets the document title; the home page is the ticker.
export const routes: Routes = [
  {
    path: '',
    title: 'FixtureSwing: FPL fixture ticker with projected goals and clean sheets',
    loadComponent: () => import('./pages/home/home').then((m) => m.HomeComponent),
  },
  { path: '**', redirectTo: '' },
];
