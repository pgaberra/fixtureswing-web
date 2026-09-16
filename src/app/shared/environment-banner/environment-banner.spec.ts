import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { Api } from '../../api/api';
import { EnvironmentBannerComponent } from './environment-banner';

function render(environmentName: string, version = '') {
  TestBed.configureTestingModule({
    imports: [EnvironmentBannerComponent],
    providers: [
      { provide: Api, useValue: { invoke: () => Promise.resolve({ api: { version: 'v0.9.0' } }) } },
    ],
  });
  const fixture = TestBed.createComponent(EnvironmentBannerComponent);
  fixture.componentRef.setInput('environmentName', environmentName);
  fixture.componentRef.setInput('version', version);
  fixture.detectChanges();
  return fixture;
}

describe('EnvironmentBannerComponent', () => {
  it('renders nothing in production', () => {
    const fixture = render('production', 'v1.0.0');
    expect((fixture.nativeElement as HTMLElement).textContent?.trim()).toBe('');
  });

  it('labels staging with the web version and shows the api version on demand', async () => {
    const fixture = render('staging', 'v0.3.0');
    const page = fixture.nativeElement as HTMLElement;
    const button = page.querySelector('button');
    expect(button?.textContent).toContain('STAGING · web v0.3.0');
    button?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(page.textContent).toContain('api v0.9.0');
  });
});
