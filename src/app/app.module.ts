import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { LayoutModule } from '@angular/cdk/layout';

// App Components
import { AppComponent } from './app.component';

// Feature Modules
import { TerminalModule } from './features/terminal/terminal.module';

// Core Services
import { CommandService } from './core/services/command.service';
import { SessionService } from './core/services/session.service';
import { PortfolioService } from './core/services/portfolio.service';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    LayoutModule,
    TerminalModule
  ],
  providers: [
    CommandService,
    SessionService,
    PortfolioService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }