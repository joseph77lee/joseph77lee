import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LayoutModule } from '@angular/cdk/layout';

// Terminal Components
import { TerminalContainerComponent } from './components/terminal-container/terminal-container.component';
import { CommandInputComponent } from './components/command-input/command-input.component';
import { OutputRendererComponent } from './components/output-renderer/output-renderer.component';
import { TypewriterTextComponent } from './components/typewriter-text/typewriter-text.component';
import { LoadingIndicatorComponent } from './components/loading-indicator/loading-indicator.component';

// Terminal Services
import { CommandHistoryService } from './services/command-history.service';
import { OutputFormatterService } from './services/output-formatter.service';
import { KeyboardNavigationService } from './services/keyboard-navigation.service';

// Terminal Directives
import { TerminalFocusDirective } from './directives/terminal-focus.directive';
import { TerminalTouchDirective } from './directives/terminal-touch.directive';

@NgModule({
  declarations: [
    // Components
    TerminalContainerComponent,
    CommandInputComponent,
    OutputRendererComponent,
    TypewriterTextComponent,
    LoadingIndicatorComponent,
    
    // Directives
    TerminalFocusDirective,
    TerminalTouchDirective
  ],
  imports: [
    CommonModule,
    FormsModule,
    LayoutModule
  ],
  providers: [
    CommandHistoryService,
    OutputFormatterService,
    KeyboardNavigationService
  ],
  exports: [
    TerminalContainerComponent
  ]
})
export class TerminalModule { }