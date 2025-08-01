import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { catchError, map, tap, shareReplay } from 'rxjs/operators';
import { 
  Session, 
  SessionPreferences, 
  SessionInitRequest, 
  SessionUpdateRequest,
  ThemeType,
  ThemeConfig,
  DEFAULT_SESSION_PREFERENCES,
  AVAILABLE_THEMES
} from '../models/session.models';

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private readonly apiUrl = '/api/v1/sessions';
  private readonly storageKey = 'portfolio-session';
  private readonly preferencesKey = 'portfolio-preferences';

  // State management
  private sessionSubject = new BehaviorSubject<Session | null>(null);
  private themeSubject = new BehaviorSubject<ThemeType>('dark');
  private preferencesSubject = new BehaviorSubject<SessionPreferences>(DEFAULT_SESSION_PREFERENCES);

  // Public observables
  readonly session$ = this.sessionSubject.asObservable();
  readonly theme$ = this.themeSubject.asObservable();
  readonly preferences$ = this.preferencesSubject.asObservable();
  readonly currentThemeConfig$ = this.theme$.pipe(
    map(theme => AVAILABLE_THEMES[theme]),
    shareReplay(1)
  );

  // Computed properties
  get currentSession(): Session | null {
    return this.sessionSubject.value;
  }

  get sessionId(): string | null {
    return this.currentSession?.id || null;
  }

  get currentTheme(): ThemeType {
    return this.themeSubject.value;
  }

  get currentPreferences(): SessionPreferences {
    return this.preferencesSubject.value;
  }

  get availableThemes(): ThemeConfig[] {
    return Object.values(AVAILABLE_THEMES);
  }

  constructor(private http: HttpClient) {
    this.initializeSession();
    this.loadStoredPreferences();
  }

  /**
   * Initialize or restore session
   */
  private initializeSession(): void {
    const storedSession = this.getStoredSession();
    
    if (storedSession && this.isSessionValid(storedSession)) {
      this.restoreSession(storedSession);
    } else {
      this.createNewSession().subscribe({
        next: (session) => {
          console.log('Session initialized successfully:', session.id);
        },
        error: (error) => {
          console.warn('Failed to initialize session:', error);
        }
      });
    }
  }

  /**
   * Create a new session
   */
  createNewSession(): Observable<Session> {
    // For now, always use offline mode since we don't have a backend API
    const offlineSession = this.createOfflineSession();
    return of(offlineSession);
  }

  /**
   * Update session preferences
   */
  updatePreferences(preferences: Partial<SessionPreferences>): Observable<SessionPreferences> {
    const newPreferences = { ...this.currentPreferences, ...preferences };
    
    if (!this.sessionId) {
      return of(this.updatePreferencesLocally(newPreferences));
    }

    const updateRequest: SessionUpdateRequest = { preferences };

    return this.http.patch<Session>(`${this.apiUrl}/${this.sessionId}`, updateRequest)
      .pipe(
        map(session => session.preferences),
        tap(updatedPreferences => {
          this.setPreferences(updatedPreferences);
          this.storePreferences(updatedPreferences);
        }),
        catchError(error => {
          console.warn('Failed to update preferences via API, updating locally', error);
          return of(this.updatePreferencesLocally(newPreferences));
        })
      );
  }

  /**
   * Change theme
   */
  changeTheme(theme: ThemeType): Observable<ThemeType> {
    if (!AVAILABLE_THEMES[theme]) {
      return throwError(() => new Error(`Invalid theme: ${theme}`));
    }

    this.themeSubject.next(theme);
    
    const updatedPreferences = { ...this.currentPreferences, theme };
    
    return this.updatePreferences(updatedPreferences).pipe(
      map(() => theme),
      tap(() => this.applyThemeToDocument(theme))
    );
  }

  /**
   * Get session info
   */
  getSessionInfo(): Observable<Session> {
    if (!this.sessionId) {
      return throwError(() => new Error('No active session'));
    }

    return this.http.get<Session>(`${this.apiUrl}/${this.sessionId}`)
      .pipe(
        tap(session => {
          this.setSession(session);
          this.storeSession(session);
        }),
        catchError(error => {
          console.warn('Failed to fetch session info', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * End current session
   */
  endSession(): void {
    if (this.sessionId) {
      // Attempt to notify server (fire and forget)
      this.http.delete(`${this.apiUrl}/${this.sessionId}`).subscribe({
        error: () => console.warn('Failed to notify server of session end')
      });
    }

    this.clearStoredSession();
    this.sessionSubject.next(null);
  }

  /**
   * Check if session is expired
   */
  isSessionExpired(): boolean {
    const session = this.currentSession;
    if (!session) return true;
    
    return new Date() > new Date(session.expiresAt);
  }

  // Private methods

  private restoreSession(session: Session): void {
    if (this.isSessionExpired()) {
      this.createNewSession().subscribe();
      return;
    }

    this.setSession(session);
    this.setTheme(session.theme);
    this.setPreferences(session.preferences);
  }

  private setSession(session: Session): void {
    this.sessionSubject.next(session);
    this.setTheme(session.theme);
    this.setPreferences(session.preferences);
  }

  private setTheme(theme: ThemeType): void {
    this.themeSubject.next(theme);
    this.applyThemeToDocument(theme);
  }

  private setPreferences(preferences: SessionPreferences): void {
    this.preferencesSubject.next(preferences);
  }

  private updatePreferencesLocally(preferences: SessionPreferences): SessionPreferences {
    this.setPreferences(preferences);
    this.storePreferences(preferences);
    
    // Update session if it exists
    const session = this.currentSession;
    if (session) {
      const updatedSession = { ...session, preferences };
      this.sessionSubject.next(updatedSession);
      this.storeSession(updatedSession);
    }
    
    return preferences;
  }

  private applyThemeToDocument(theme: ThemeType): void {
    const themeConfig = AVAILABLE_THEMES[theme];
    const root = document.documentElement;

    // Apply CSS custom properties
    Object.entries(themeConfig.colors).forEach(([key, value]) => {
      root.style.setProperty(`--terminal-${key}`, value);
    });

    root.style.setProperty('--terminal-font-primary', themeConfig.fonts.primary);
    
    // Update body class for theme-specific styles
    document.body.className = document.body.className.replace(/theme-\w+/g, '');
    document.body.classList.add(`theme-${theme}`);
  }

  private createOfflineSession(): Session {
    const sessionId = this.generateSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    const offlineSession: Session = {
      id: sessionId,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      welcomeMessage: "Welcome to Joseph Lee's interactive portfolio! Type 'help' to begin.",
      prompt: 'joseph@portfolio:~$ ',
      theme: this.currentTheme,
      preferences: this.currentPreferences,
      metadata: {
        userAgent: navigator.userAgent,
        referrer: document.referrer,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        firstVisit: !this.hasStoredSession()
      }
    };

    this.setSession(offlineSession);
    this.storeSession(offlineSession);
    
    return offlineSession;
  }

  private isSessionValid(session: Session): boolean {
    return !!(session && session.id && new Date() < new Date(session.expiresAt));
  }

  private generateSessionId(): string {
    return 'offline-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
  }

  // Storage methods

  private storeSession(session: Session): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(session));
    } catch (error) {
      console.warn('Failed to store session', error);
    }
  }

  private getStoredSession(): Session | null {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to retrieve stored session', error);
      return null;
    }
  }

  private hasStoredSession(): boolean {
    return !!localStorage.getItem(this.storageKey);
  }

  private clearStoredSession(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.warn('Failed to clear stored session', error);
    }
  }

  private storePreferences(preferences: SessionPreferences): void {
    try {
      localStorage.setItem(this.preferencesKey, JSON.stringify(preferences));
    } catch (error) {
      console.warn('Failed to store preferences', error);
    }
  }

  private loadStoredPreferences(): void {
    try {
      const stored = localStorage.getItem(this.preferencesKey);
      if (stored) {
        const preferences = { ...DEFAULT_SESSION_PREFERENCES, ...JSON.parse(stored) };
        this.setPreferences(preferences);
        this.setTheme(preferences.theme);
      }
    } catch (error) {
      console.warn('Failed to load stored preferences', error);
    }
  }
}