import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { SessionService } from './core/services/session.service';
import { ThemeConfig } from './core/models/session.models';

@Component({
  selector: 'app-root',
  template: `
    <div class="app-container" [class]="'theme-' + currentTheme">
      <app-terminal-container></app-terminal-container>
    </div>
  `,
  styleUrls: ['./app.component.scss'],
  host: {
    'class': 'portfolio-app',
    '[attr.data-theme]': 'currentTheme'
  }
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Joseph Lee - Interactive Portfolio';
  currentTheme = 'dark';

  private destroy$ = new Subject<void>();

  constructor(private sessionService: SessionService) {}

  ngOnInit(): void {
    this.initializeTheme();
    this.subscribeToThemeChanges();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeTheme(): void {
    // Set initial meta tags
    this.updateMetaTags();
  }

  private subscribeToThemeChanges(): void {
    this.sessionService.currentThemeConfig$
      .pipe(takeUntil(this.destroy$))
      .subscribe(themeConfig => {
        if (themeConfig) {
          this.currentTheme = themeConfig.name;
          this.applyGlobalTheme(themeConfig);
        }
      });
  }

  private applyGlobalTheme(themeConfig: ThemeConfig): void {
    const root = document.documentElement;
    
    // Apply CSS custom properties globally
    Object.entries(themeConfig.colors).forEach(([key, value]) => {
      root.style.setProperty(`--terminal-${key}`, value);
    });

    root.style.setProperty('--terminal-font-primary', themeConfig.fonts.primary);
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', themeConfig.colors.background);
    }

    // Update body class
    document.body.className = document.body.className.replace(/theme-\w+/g, '');
    document.body.classList.add(`theme-${themeConfig.name}`);
  }

  private updateMetaTags(): void {
    // Update page title
    document.title = this.title;

    // Add meta description
    const metaDescription = document.createElement('meta');
    metaDescription.name = 'description';
    metaDescription.content = 'Interactive terminal-style portfolio showcasing Joseph Lee\'s frontend development skills, experience, and projects. Explore using command-line interface.';
    document.head.appendChild(metaDescription);

    // Add meta keywords
    const metaKeywords = document.createElement('meta');
    metaKeywords.name = 'keywords';
    metaKeywords.content = 'Joseph Lee, Frontend Developer, Angular, TypeScript, JavaScript, Portfolio, Interactive Terminal, Web Developer';
    document.head.appendChild(metaKeywords);

    // Add viewport meta tag
    const metaViewport = document.createElement('meta');
    metaViewport.name = 'viewport';
    metaViewport.content = 'width=device-width, initial-scale=1.0, user-scalable=yes';
    document.head.appendChild(metaViewport);

    // Add theme color meta tag
    const metaThemeColor = document.createElement('meta');
    metaThemeColor.name = 'theme-color';
    metaThemeColor.content = '#0d1117';
    document.head.appendChild(metaThemeColor);
  }
}