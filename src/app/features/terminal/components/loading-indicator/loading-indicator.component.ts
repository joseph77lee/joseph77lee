import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading-indicator',
  template: `
    <div class="loading-container" *ngIf="isLoading" [attr.aria-label]="loadingMessage">
      <div class="loading-animation" role="status" aria-live="polite">
        <div class="loading-dots" aria-hidden="true">
          <span class="dot" *ngFor="let dot of dots; let i = index"
                [style.animation-delay]="i * 0.2 + 's'">.</span>
        </div>
        <span class="loading-text">{{ loadingMessage }}</span>
        <span class="sr-only">Loading, please wait</span>
      </div>
    </div>
  `,
  styleUrls: ['./loading-indicator.component.scss'],
  host: {
    'class': 'loading-indicator-component'
  }
})
export class LoadingIndicatorComponent {
  @Input() isLoading = false;
  @Input() loadingMessage = 'Processing...';
  
  dots = [1, 2, 3]; // Array for *ngFor to create 3 dots
}