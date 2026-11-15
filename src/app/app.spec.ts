import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { AuthService } from './core/auth/auth.service';
import { Landing } from './features/landing/landing';

@Component({ template: 'Page content' })
class OtherPage {}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([
          { path: '', component: Landing },
          { path: '**', component: OtherPage },
        ]),
        { provide: AuthService, useValue: { isAuthenticated: signal(false), logout: vi.fn() } },
      ],
    }).compileComponents();
  });

  it('shows one frosted navbar on inner routes and only the injected solid navbar on landing', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    for (const url of ['/lift-club', '/login', '/privacy', '/forgot-password', '/unknown']) {
      await router.navigateByUrl(url);
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelectorAll('app-navbar')).toHaveLength(1);
      expect(fixture.nativeElement.querySelector('.site-header .navbar--frosted')).toBeTruthy();
    }
    await router.navigateByUrl('/?campaign=example');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('app-navbar')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('.site-header')).toBeNull();
    expect(fixture.nativeElement.querySelector('.landing-navbar .navbar--frosted')).toBeNull();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('keeps the routing outlet without rendering the previous layout', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
    expect(compiled.querySelector('app-navbar')).toBeNull();
    expect(compiled.querySelector('app-footer')).toBeNull();
  });
});
