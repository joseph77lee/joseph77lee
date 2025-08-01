import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BreakpointObserver } from '@angular/cdk/layout';
import { of, BehaviorSubject } from 'rxjs';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

import { TerminalContainerComponent } from './terminal-container.component';
import { CommandService } from '../../../../core/services/command.service';
import { SessionService } from '../../../../core/services/session.service';
import { PortfolioService } from '../../../../core/services/portfolio.service';
import { CommandHistoryItem, CommandExecutionState } from '../../../../core/models/command.models';
import { Session, ThemeConfig } from '../../../../core/models/session.models';

describe('TerminalContainerComponent', () => {
  let component: TerminalContainerComponent;
  let fixture: ComponentFixture<TerminalContainerComponent>;
  let mockCommandService: jasmine.SpyObj<CommandService>;
  let mockSessionService: jasmine.SpyObj<SessionService>;
  let mockPortfolioService: jasmine.SpyObj<PortfolioService>;
  let mockBreakpointObserver: jasmine.SpyObj<BreakpointObserver>;

  const mockSession: Session = {
    id: 'test-session',
    createdAt: '2024-01-01T00:00:00Z',
    expiresAt: '2024-01-02T00:00:00Z',
    welcomeMessage: 'Welcome to the terminal!',
    prompt: 'test@terminal:~$ ',
    theme: 'dark',
    preferences: {
      showTypingAnimation: true,
      autoComplete: true,
      theme: 'dark',
      animationSpeed: 50,
      soundEnabled: false,
      showWelcomeMessage: true
    },
    metadata: {
      userAgent: 'test',
      referrer: '',
      screenResolution: '1920x1080',
      timezone: 'UTC',
      language: 'en',
      firstVisit: true
    }
  };

  const mockThemeConfig: ThemeConfig = {
    name: 'dark',
    displayName: 'Dark Terminal',
    colors: {
      background: '#0d1117',
      text: '#c9d1d9',
      accent: '#58a6ff',
      success: '#56d364',
      error: '#f85149',
      warning: '#d29922',
      prompt: '#79c0ff'
    },
    fonts: {
      primary: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace"
    }
  };

  beforeEach(async () => {
    // Create spy objects
    mockCommandService = jasmine.createSpyObj('CommandService', [
      'executeCommand',
      'isValidCommand',
      'getCommandSuggestions'
    ], {
      executionState$: new BehaviorSubject(CommandExecutionState.IDLE),
      isProcessing: false,
      availableCommands: ['help', 'summary', 'skills']
    });

    mockSessionService = jasmine.createSpyObj('SessionService', [
      'changeTheme',
      'updatePreferences'
    ], {
      session$: of(mockSession),
      currentThemeConfig$: of(mockThemeConfig),
      availableThemes: [mockThemeConfig]
    });

    mockPortfolioService = jasmine.createSpyObj('PortfolioService', [
      'getPortfolio'
    ]);

    mockBreakpointObserver = jasmine.createSpyObj('BreakpointObserver', [
      'observe',
      'isMatched'
    ]);

    mockBreakpointObserver.observe.and.returnValue(of({ matches: false, breakpoints: {} }));
    mockBreakpointObserver.isMatched.and.returnValue(false);

    await TestBed.configureTestingModule({
      declarations: [TerminalContainerComponent],
      providers: [
        { provide: CommandService, useValue: mockCommandService },
        { provide: SessionService, useValue: mockSessionService },
        { provide: PortfolioService, useValue: mockPortfolioService },
        { provide: BreakpointObserver, useValue: mockBreakpointObserver }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TerminalContainerComponent);
    component = fixture.componentInstance;
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with empty command history', () => {
      expect(component.commandHistory).toEqual([]);
    });

    it('should set initial values from session', () => {
      fixture.detectChanges();
      expect(component.sessionId).toBe('test-session');
      expect(component.welcomeMessage).toBe('Welcome to the terminal!');
      expect(component.currentPrompt).toBe('test@terminal:~$ ');
    });

    it('should add welcome message to history', () => {
      fixture.detectChanges();
      expect(component.commandHistory.length).toBe(1);
      expect(component.commandHistory[0].type).toBe('system');
    });
  });

  describe('Responsive Behavior', () => {
    it('should detect mobile breakpoint', () => {
      mockBreakpointObserver.isMatched.and.returnValue(true);
      fixture.detectChanges();
      expect(component.isMobile).toBeTrue();
    });

    it('should detect tablet breakpoint', () => {
      mockBreakpointObserver.isMatched.and.returnValues(false, true);
      fixture.detectChanges();
      expect(component.isTablet).toBeTrue();
      expect(component.isMobile).toBeFalse();
    });

    it('should apply mobile class when on mobile', () => {
      component.isMobile = true;
      fixture.detectChanges();
      const hostElement = fixture.debugElement.nativeElement;
      expect(hostElement.classList.contains('mobile')).toBeTrue();
    });
  });

  describe('Command Execution', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should execute valid command', () => {
      const mockOutput = {
        success: true,
        data: {
          output: {
            content: 'Help content',
            type: 'text' as const
          },
          executionTime: 100
        },
        metadata: {
          commandId: 'cmd-1',
          timestamp: '2024-01-01T00:00:00Z',
          version: '1.0'
        }
      };

      mockCommandService.executeCommand.and.returnValue(of(mockOutput));

      component.executeCommand('help');

      expect(mockCommandService.executeCommand).toHaveBeenCalledWith('help', 'test-session');
      expect(component.commandHistory.length).toBeGreaterThan(1);
      
      // Should have command echo and output
      const commandEcho = component.commandHistory.find(item => item.type === 'command');
      const commandOutput = component.commandHistory.find(item => item.type === 'output');
      
      expect(commandEcho).toBeTruthy();
      expect(commandEcho?.command).toBe('help');
      expect(commandOutput).toBeTruthy();
    });

    it('should handle command errors', () => {
      const mockError = {
        success: false,
        error: {
          code: 'INVALID_COMMAND',
          message: 'Command not found',
          suggestion: 'Try "help" for available commands'
        }
      };

      mockCommandService.executeCommand.and.returnValue(of().pipe(
        // Simulate error
        () => { throw mockError; }
      ));

      component.executeCommand('invalid');

      const errorItem = component.commandHistory.find(item => item.type === 'error');
      expect(errorItem).toBeTruthy();
      expect(errorItem?.suggestion).toBe('Try "help" for available commands');
    });

    it('should ignore empty commands', () => {
      const initialHistoryLength = component.commandHistory.length;
      
      component.executeCommand('');
      component.executeCommand('   ');

      expect(component.commandHistory.length).toBe(initialHistoryLength);
      expect(mockCommandService.executeCommand).not.toHaveBeenCalled();
    });

    it('should trim commands before execution', () => {
      mockCommandService.executeCommand.and.returnValue(of({
        success: true,
        data: { output: { content: 'Test', type: 'text' as const }, executionTime: 100 },
        metadata: { commandId: 'cmd-1', timestamp: '2024-01-01T00:00:00Z', version: '1.0' }
      }));

      component.executeCommand('  help  ');

      expect(mockCommandService.executeCommand).toHaveBeenCalledWith('help', 'test-session');
    });
  });

  describe('Built-in Commands', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should handle clear command', () => {
      // Add some history first
      component.commandHistory.push({
        id: 'test-1',
        type: 'command',
        command: 'test',
        timestamp: new Date()
      });

      component.executeCommand('clear');

      // Should only have welcome message
      expect(component.commandHistory.length).toBe(1);
      expect(component.commandHistory[0].type).toBe('system');
    });

    it('should handle theme command with argument', () => {
      mockSessionService.changeTheme.and.returnValue(of('light'));

      component.executeCommand('theme light');

      expect(mockSessionService.changeTheme).toHaveBeenCalledWith('light');
    });

    it('should show available themes when no argument provided', () => {
      component.executeCommand('theme');

      const systemMessage = component.commandHistory.find(item => 
        item.type === 'system' && 
        typeof item.content?.content === 'string' &&
        item.content.content.includes('Available themes')
      );
      expect(systemMessage).toBeTruthy();
    });
  });

  describe('Terminal Interaction', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should focus input on terminal click', () => {
      const inputElement = jasmine.createSpyObj('HTMLInputElement', ['focus']);
      spyOn(document, 'querySelector').and.returnValue(inputElement);
      spyOn(window, 'getSelection').and.returnValue({
        toString: () => ''
      } as Selection);

      component.onTerminalClick(new Event('click'));

      expect(inputElement.focus).toHaveBeenCalled();
    });

    it('should not focus input when text is selected', () => {
      const inputElement = jasmine.createSpyObj('HTMLInputElement', ['focus']);
      spyOn(document, 'querySelector').and.returnValue(inputElement);
      spyOn(window, 'getSelection').and.returnValue({
        toString: () => 'selected text'
      } as Selection);

      component.onTerminalClick(new Event('click'));

      expect(inputElement.focus).not.toHaveBeenCalled();
    });

    it('should handle Ctrl+L to clear terminal', () => {
      const event = new KeyboardEvent('keydown', { 
        key: 'l', 
        ctrlKey: true,
        cancelable: true 
      });
      
      spyOn(event, 'preventDefault');

      component.onKeydown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.commandHistory.length).toBe(1); // Only welcome message
    });

    it('should handle Ctrl+C when processing', () => {
      component.isProcessing = true;
      const event = new KeyboardEvent('keydown', { 
        key: 'c', 
        ctrlKey: true,
        cancelable: true 
      });
      
      spyOn(event, 'preventDefault');

      component.onKeydown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      
      const cancelMessage = component.commandHistory.find(item => 
        item.type === 'system' && 
        typeof item.content?.content === 'string' &&
        item.content.content.includes('^C')
      );
      expect(cancelMessage).toBeTruthy();
    });
  });

  describe('Theme Application', () => {
    it('should apply theme styles to terminal body', () => {
      fixture.detectChanges();
      
      // Mock terminal body element
      const mockElement = jasmine.createSpyObj('HTMLElement', [], {
        style: {
          setProperty: jasmine.createSpy('setProperty')
        }
      });
      
      component.terminalBody = { nativeElement: mockElement };
      
      // Trigger theme application
      component.ngOnInit();
      
      expect(mockElement.style.setProperty).toHaveBeenCalledWith('--terminal-bg', '#0d1117');
      expect(mockElement.style.setProperty).toHaveBeenCalledWith('--terminal-text', '#c9d1d9');
    });
  });

  describe('Screen Reader Support', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should announce commands to screen reader', () => {
      component.executeCommand('help');
      
      expect(component.screenReaderAnnouncement).toContain('Command entered: help');
    });

    it('should clear announcements after delay', (done) => {
      component.executeCommand('help');
      
      setTimeout(() => {
        expect(component.screenReaderAnnouncement).toBe('');
        done();
      }, 1100); // Slightly longer than the 1000ms delay
    });
  });

  describe('Command History Tracking', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should track commands by ID', () => {
      const item1: CommandHistoryItem = {
        id: 'cmd-1',
        type: 'command',
        command: 'help',
        timestamp: new Date()
      };
      
      const item2: CommandHistoryItem = {
        id: 'cmd-2',
        type: 'command',
        command: 'summary',
        timestamp: new Date()
      };

      expect(component.trackByCommandId(0, item1)).toBe('cmd-1');
      expect(component.trackByCommandId(1, item2)).toBe('cmd-2');
    });

    it('should generate unique command IDs', () => {
      const id1 = component['generateCommandId']();
      const id2 = component['generateCommandId']();
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^cmd-\d+-\d+$/);
    });
  });

  describe('Processing State', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should reflect processing state from service', () => {
      const executionStateSubject = new BehaviorSubject(CommandExecutionState.PROCESSING);
      (mockCommandService as any).executionState$ = executionStateSubject;

      // Reinitialize component to pick up new observable
      component.ngOnInit();

      expect(component.isProcessing).toBeTrue();
      
      executionStateSubject.next(CommandExecutionState.IDLE);
      expect(component.isProcessing).toBeFalse();
    });

    it('should apply processing class to host element', () => {
      component.isProcessing = true;
      fixture.detectChanges();
      
      const hostElement = fixture.debugElement.nativeElement;
      expect(hostElement.classList.contains('processing')).toBeTrue();
    });
  });

  describe('Component Cleanup', () => {
    it('should clean up subscriptions on destroy', () => {
      fixture.detectChanges();
      spyOn(component['destroy$'], 'next');
      spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(component['destroy$'].next).toHaveBeenCalled();
      expect(component['destroy$'].complete).toHaveBeenCalled();
    });
  });
});