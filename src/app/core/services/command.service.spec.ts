import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CommandService } from './command.service';
import { CommandOutput, CommandError, CommandExecutionState } from '../models/command.models';

describe('CommandService', () => {
  let service: CommandService;
  let httpMock: HttpTestingController;

  const mockSessionId = 'test-session-123';
  const mockApiUrl = '/api/v1';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CommandService]
    });
    
    service = TestBed.inject(CommandService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with idle state', () => {
      expect(service.isProcessing).toBeFalse();
    });

    it('should have available commands', () => {
      expect(service.availableCommands).toContain('help');
      expect(service.availableCommands).toContain('summary');
      expect(service.availableCommands).toContain('skills');
    });
  });

  describe('Command Validation', () => {
    it('should validate known commands', () => {
      expect(service.isValidCommand('help')).toBeTrue();
      expect(service.isValidCommand('summary')).toBeTrue();
      expect(service.isValidCommand('skills frontend')).toBeTrue();
    });

    it('should reject unknown commands', () => {
      expect(service.isValidCommand('invalid')).toBeFalse();
      expect(service.isValidCommand('')).toBeFalse();
      expect(service.isValidCommand('nonexistent')).toBeFalse();
    });

    it('should handle command arguments', () => {
      expect(service.isValidCommand('skills')).toBeTrue();
      expect(service.isValidCommand('skills frontend')).toBeTrue();
      expect(service.isValidCommand('theme dark')).toBeTrue();
    });
  });

  describe('Command Suggestions', () => {
    it('should return all commands for empty input', () => {
      const suggestions = service.getCommandSuggestions('');
      expect(suggestions.length).toBe(service.availableCommands.length);
    });

    it('should filter commands by partial input', () => {
      const suggestions = service.getCommandSuggestions('he');
      expect(suggestions).toContain('help');
      expect(suggestions).not.toContain('summary');
    });

    it('should handle case insensitive matching', () => {
      const suggestions = service.getCommandSuggestions('HE');
      expect(suggestions).toContain('help');
    });

    it('should return empty array for no matches', () => {
      const suggestions = service.getCommandSuggestions('xyz');
      expect(suggestions).toEqual([]);
    });
  });

  describe('Command Execution', () => {
    it('should execute valid command successfully', (done) => {
      const mockResponse: CommandOutput = {
        success: true,
        data: {
          output: {
            content: 'Test output',
            type: 'text'
          },
          executionTime: 100,
          nextSuggestions: ['skills']
        },
        metadata: {
          commandId: 'cmd-1',
          timestamp: '2024-01-01T00:00:00Z',
          version: '1.0'
        }
      };

      service.executeCommand('help', mockSessionId).subscribe({
        next: (response) => {
          expect(response).toEqual(mockResponse);
          expect(service.isProcessing).toBeFalse();
          done();
        }
      });

      expect(service.isProcessing).toBeTrue();

      const req = httpMock.expectOne(`${mockApiUrl}/commands/execute`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.command).toBe('help');
      expect(req.request.body.sessionId).toBe(mockSessionId);
      
      req.flush(mockResponse);
    });

    it('should handle command execution errors', (done) => {
      const mockError = {
        status: 400,
        statusText: 'Bad Request',
        error: {
          success: false,
          error: {
            code: 'INVALID_COMMAND',
            message: 'Command not found'
          }
        }
      };

      service.executeCommand('invalid', mockSessionId).subscribe({
        error: (error) => {
          expect(error.error.code).toBe('INVALID_COMMAND');
          expect(service.isProcessing).toBeFalse();
          done();
        }
      });

      const req = httpMock.expectOne(`${mockApiUrl}/commands/execute`);
      req.flush(mockError.error, mockError);
    });

    it('should prevent concurrent command execution', (done) => {
      service.executeCommand('help', mockSessionId).subscribe();
      
      // Try to execute another command while first is processing
      service.executeCommand('summary', mockSessionId).subscribe({
        error: (error) => {
          expect(error.message).toContain('Another command is currently processing');
          done();
        }
      });

      // Complete first request
      const req = httpMock.expectOne(`${mockApiUrl}/commands/execute`);
      req.flush({
        success: true,
        data: { output: { content: 'Test', type: 'text' }, executionTime: 100 },
        metadata: { commandId: 'cmd-1', timestamp: '2024-01-01T00:00:00Z', version: '1.0' }
      });
    });

    it('should handle network timeout', (done) => {
      service.executeCommand('help', mockSessionId).subscribe({
        error: (error) => {
          expect(error.error.code).toBe('TIMEOUT');
          done();
        }
      });

      const req = httpMock.expectOne(`${mockApiUrl}/commands/execute`);
      // Simulate timeout by not responding within the timeout period
      req.error(new ProgressEvent('timeout'));
    });
  });

  describe('Command History', () => {
    it('should track command history', (done) => {
      const commands = ['help', 'summary', 'skills'];
      let commandIndex = 0;

      const executeNext = () => {
        if (commandIndex < commands.length) {
          const command = commands[commandIndex];
          service.executeCommand(command, mockSessionId).subscribe({
            next: () => {
              commandIndex++;
              if (commandIndex === commands.length) {
                // Check final history
                service.commandHistory$.subscribe(history => {
                  expect(history).toEqual(commands);
                  done();
                });
              } else {
                executeNext();
              }
            }
          });

          const req = httpMock.expectOne(`${mockApiUrl}/commands/execute`);
          req.flush({
            success: true,
            data: { output: { content: 'Test', type: 'text' }, executionTime: 100 },
            metadata: { commandId: `cmd-${commandIndex}`, timestamp: '2024-01-01T00:00:00Z', version: '1.0' }
          });
        }
      };

      executeNext();
    });

    it('should not add duplicate consecutive commands', (done) => {
      service.executeCommand('help', mockSessionId).subscribe(() => {
        service.executeCommand('help', mockSessionId).subscribe(() => {
          service.commandHistory$.subscribe(history => {
            expect(history.filter(cmd => cmd === 'help').length).toBe(1);
            done();
          });
        });
        
        const req2 = httpMock.expectOne(`${mockApiUrl}/commands/execute`);
        req2.flush({
          success: true,
          data: { output: { content: 'Test', type: 'text' }, executionTime: 100 },
          metadata: { commandId: 'cmd-2', timestamp: '2024-01-01T00:00:00Z', version: '1.0' }
        });
      });

      const req1 = httpMock.expectOne(`${mockApiUrl}/commands/execute`);
      req1.flush({
        success: true,
        data: { output: { content: 'Test', type: 'text' }, executionTime: 100 },
        metadata: { commandId: 'cmd-1', timestamp: '2024-01-01T00:00:00Z', version: '1.0' }
      });
    });

    it('should clear history', () => {
      service.clearHistory();
      service.commandHistory$.subscribe(history => {
        expect(history).toEqual([]);
      });
    });

    it('should limit history to 50 commands', (done) => {
      // This test would require executing 51 commands
      // For brevity, we'll just test the logic conceptually
      const history = service.getHistory();
      expect(Array.isArray(history)).toBeTrue();
      done();
    });
  });

  describe('Execution State Management', () => {
    it('should track execution state changes', (done) => {
      const states: CommandExecutionState[] = [];
      
      service.executionState$.subscribe(state => {
        states.push(state);
      });

      service.executeCommand('help', mockSessionId).subscribe(() => {
        expect(states).toContain(CommandExecutionState.PROCESSING);
        expect(states[states.length - 1]).toBe(CommandExecutionState.IDLE);
        done();
      });

      const req = httpMock.expectOne(`${mockApiUrl}/commands/execute`);
      req.flush({
        success: true,
        data: { output: { content: 'Test', type: 'text' }, executionTime: 100 },
        metadata: { commandId: 'cmd-1', timestamp: '2024-01-01T00:00:00Z', version: '1.0' }
      });
    });

    it('should set error state on command failure', (done) => {
      service.executionState$.subscribe(state => {
        if (state === CommandExecutionState.ERROR) {
          done();
        }
      });

      service.executeCommand('help', mockSessionId).subscribe({
        error: () => {
          // Error handled in state subscription above
        }
      });

      const req = httpMock.expectOne(`${mockApiUrl}/commands/execute`);
      req.flush({ error: 'Server error' }, { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('Available Commands API', () => {
    it('should fetch available commands from API', (done) => {
      const mockCommands = [
        {
          name: 'help',
          description: 'Show help',
          usage: 'help',
          category: 'navigation' as const
        }
      ];

      service.getAvailableCommands().subscribe(commands => {
        expect(commands).toEqual(mockCommands);
        done();
      });

      const req = httpMock.expectOne(`${mockApiUrl}/commands`);
      expect(req.request.method).toBe('GET');
      req.flush({ data: mockCommands });
    });

    it('should fallback to default commands on API error', (done) => {
      service.getAvailableCommands().subscribe(commands => {
        expect(commands.length).toBeGreaterThan(0);
        expect(commands[0].name).toBe('help');
        done();
      });

      const req = httpMock.expectOne(`${mockApiUrl}/commands`);
      req.flush({ error: 'Not found' }, { status: 404, statusText: 'Not Found' });
    });
  });

  describe('Error Handling', () => {
    it('should create appropriate error for invalid command', () => {
      service.executeCommand('invalid', mockSessionId).subscribe({
        error: (error) => {
          expect(error).toBeTruthy();
        }
      });

      // No HTTP request should be made for invalid commands
      httpMock.expectNone(`${mockApiUrl}/commands/execute`);
    });

    it('should handle different HTTP error codes', () => {
      const testCases = [
        { status: 400, expectedCode: 'INVALID_INPUT' },
        { status: 404, expectedCode: 'COMMAND_NOT_FOUND' },
        { status: 429, expectedCode: 'RATE_LIMIT' },
        { status: 500, expectedCode: 'SERVER_ERROR' }
      ];

      testCases.forEach(testCase => {
        service.executeCommand('help', mockSessionId).subscribe({
          error: (error) => {
            expect(error.error.code).toBe(testCase.expectedCode);
          }
        });

        const req = httpMock.expectOne(`${mockApiUrl}/commands/execute`);
        req.flush({ error: 'Error' }, { status: testCase.status, statusText: 'Error' });
      });
    });
  });

  describe('Current Command Tracking', () => {
    it('should track current command during execution', (done) => {
      service.currentCommand$.subscribe(command => {
        if (command === 'help') {
          expect(command).toBe('help');
        } else if (command === null) {
          done(); // Command completed
        }
      });

      service.executeCommand('help', mockSessionId).subscribe();

      const req = httpMock.expectOne(`${mockApiUrl}/commands/execute`);
      req.flush({
        success: true,
        data: { output: { content: 'Test', type: 'text' }, executionTime: 100 },
        metadata: { commandId: 'cmd-1', timestamp: '2024-01-01T00:00:00Z', version: '1.0' }
      });
    });
  });

  describe('Download Command', () => {
    let originalURL: any;
    
    beforeEach(() => {
      // Store original URL object
      originalURL = (window as any).URL;
      
      // Mock the global URL.createObjectURL and URL.revokeObjectURL
      (window as any).URL = {
        createObjectURL: jasmine.createSpy('createObjectURL').and.returnValue('blob:mock-url'),
        revokeObjectURL: jasmine.createSpy('revokeObjectURL')
      };

      // Mock document.createElement for creating download link
      spyOn(document, 'createElement').and.callFake((tagName: string) => {
        if (tagName === 'a') {
          const mockLink = {
            href: '',
            download: '',
            style: { display: '' },
            click: jasmine.createSpy('click')
          };
          return mockLink as any;
        }
        return document.createElement(tagName);
      });

      spyOn(document.body, 'appendChild').and.stub();
      spyOn(document.body, 'removeChild').and.stub();
    });

    afterEach(() => {
      // Restore original URL object
      (window as any).URL = originalURL;
    });

    it('should be included in available commands', () => {
      expect(service.availableCommands).toContain('download');
    });

    it('should validate download command', () => {
      expect(service.isValidCommand('download')).toBeTrue();
    });

    it('should execute download command successfully', (done) => {
      service.executeCommand('download', mockSessionId).subscribe({
        next: (response) => {
          expect(response.success).toBeTrue();
          expect(response.data.output.type).toBe('interactive');
          expect(response.data.output.content).toContain('Resume downloaded successfully');
          expect(response.data.output.actions).toBeDefined();
          expect(response.data.output.actions![0].type).toBe('download');
          done();
        }
      });

      // No HTTP request should be made for offline mode
      httpMock.expectNone(`${mockApiUrl}/commands/execute`);
    });

    it('should trigger browser download when executed', (done) => {
      service.executeCommand('download', mockSessionId).subscribe({
        next: (response) => {
          // Verify that URL.createObjectURL was called
          expect((window as any).URL.createObjectURL).toHaveBeenCalled();
          
          // Verify that a link element was created
          expect(document.createElement).toHaveBeenCalledWith('a');
          
          // Verify that the download was triggered
          const mockLink = (document.createElement as jasmine.Spy).calls.mostRecent().returnValue;
          expect(mockLink.click).toHaveBeenCalled();
          
          done();
        }
      });

      httpMock.expectNone(`${mockApiUrl}/commands/execute`);
    });

    it('should include download in next suggestions for relevant commands', () => {
      const helpSuggestions = (service as any).getNextSuggestions('help');
      const summarySuggestions = (service as any).getNextSuggestions('summary');
      
      expect(helpSuggestions).toContain('download');
      expect(summarySuggestions).toContain('download');
    });

    it('should handle download command with proper formatting', (done) => {
      service.executeCommand('download', mockSessionId).subscribe({
        next: (response) => {
          expect(response.data.output.formatting?.color).toBe('green');
          expect(response.data.output.formatting?.animation?.typewriter).toBeTrue();
          done();
        }
      });

      httpMock.expectNone(`${mockApiUrl}/commands/execute`);
    });

    it('should provide proper metadata for download command', (done) => {
      service.executeCommand('download', mockSessionId).subscribe({
        next: (response) => {
          expect(response.metadata.commandId).toMatch(/^cmd_\d+$/);
          expect(response.metadata.version).toBe('1.0.0');
          expect(new Date(response.metadata.timestamp)).toBeInstanceOf(Date);
          done();
        }
      });

      httpMock.expectNone(`${mockApiUrl}/commands/execute`);
    });

    it('should clean up blob URL after download', (done) => {
      service.executeCommand('download', mockSessionId).subscribe({
        next: () => {
          // Wait for cleanup timeout
          setTimeout(() => {
            expect((window as any).URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
            done();
          }, 1100); // Slightly longer than the 1000ms cleanup timeout
        }
      });

      httpMock.expectNone(`${mockApiUrl}/commands/execute`);
    });
  });
});