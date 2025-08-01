import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import { 
  Portfolio, 
  ContentSection,
  SkillsResponse,
  ExperienceResponse,
  HighlightsResponse,
  PortfolioApiResponse,
  PortfolioError
} from '../models/portfolio.models';

@Injectable({
  providedIn: 'root'
})
export class PortfolioService {
  private readonly apiUrl = '/api/v1/portfolio';
  private readonly assetsUrl = '/assets';
  
  // Cache for portfolio data
  private portfolioSubject = new BehaviorSubject<Portfolio | null>(null);
  private readonly portfolioCache$ = this.getPortfolioData().pipe(shareReplay(1));

  // Public observables
  readonly portfolio$ = this.portfolioSubject.asObservable();

  // Computed properties
  get currentPortfolio(): Portfolio | null {
    return this.portfolioSubject.value;
  }

  constructor(private http: HttpClient) {
    this.initializePortfolio();
  }

  /**
   * Initialize portfolio data
   */
  private initializePortfolio(): void {
    this.portfolioCache$.subscribe({
      next: (portfolio) => this.portfolioSubject.next(portfolio),
      error: (error) => console.warn('Failed to initialize portfolio', error)
    });
  }

  /**
   * Get complete portfolio data
   */
  getPortfolio(): Observable<Portfolio> {
    return this.portfolioCache$;
  }

  /**
   * Get specific content section
   */
  getSection(section: string): Observable<ContentSection> {
    // Try API first, fallback to local assets
    return this.http.get<PortfolioApiResponse<ContentSection>>(`${this.apiUrl}/${section}`)
      .pipe(
        map(response => response.data),
        catchError(error => {
          console.warn(`API failed for section ${section}, trying local assets`, error);
          return this.getLocalSection(section);
        })
      );
  }

  /**
   * Get skills with filtering options
   */
  getSkills(category?: string): Observable<SkillsResponse> {
    const url = category 
      ? `${this.apiUrl}/skills?category=${category}`
      : `${this.apiUrl}/skills`;

    return this.http.get<PortfolioApiResponse<SkillsResponse>>(url)
      .pipe(
        map(response => response.data),
        catchError(error => {
          console.warn('API failed for skills, using local data', error);
          return this.getLocalSkills(category);
        })
      );
  }

  /**
   * Get work experience
   */
  getExperience(): Observable<ExperienceResponse> {
    return this.http.get<PortfolioApiResponse<ExperienceResponse>>(`${this.apiUrl}/experience`)
      .pipe(
        map(response => response.data),
        catchError(error => {
          console.warn('API failed for experience, using local data', error);
          return this.getLocalExperience();
        })
      );
  }

  /**
   * Get highlights and achievements
   */
  getHighlights(): Observable<HighlightsResponse> {
    return this.http.get<PortfolioApiResponse<HighlightsResponse>>(`${this.apiUrl}/highlights`)
      .pipe(
        map(response => response.data),
        catchError(error => {
          console.warn('API failed for highlights, using local data', error);
          return this.getLocalHighlights();
        })
      );
  }

  /**
   * Download resume as PDF
   */
  downloadResume(format: 'pdf' | 'docx' = 'pdf'): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/download/resume`, { format }, {
      responseType: 'blob',
      headers: {
        'Accept': format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      }
    }).pipe(
      catchError(error => {
        console.warn('Resume download failed', error);
        return throwError(() => new PortfolioError({
          code: 'DOWNLOAD_FAILED',
          message: 'Failed to download resume. Please try again later.',
          suggestion: 'Check your internet connection or try downloading from LinkedIn.'
        }));
      })
    );
  }

  /**
   * Search portfolio content
   */
  searchContent(query: string): Observable<any[]> {
    return this.getPortfolio().pipe(
      map(portfolio => this.performLocalSearch(portfolio, query))
    );
  }

  /**
   * Get portfolio statistics
   */
  getStats(): Observable<any> {
    return this.getPortfolio().pipe(
      map(portfolio => ({
        totalExperience: portfolio.metadata.totalExperience,
        totalSkills: portfolio.skills.frontend.length + portfolio.skills.backend.length + portfolio.skills.tools.length,
        totalProjects: portfolio.highlights.filter(h => h.category === 'project').length,
        totalAchievements: portfolio.highlights.filter(h => h.category === 'achievement').length,
        primarySkills: portfolio.metadata.primarySkills,
        industries: portfolio.metadata.industries
      }))
    );
  }

  // Private methods

  private getPortfolioData(): Observable<Portfolio> {
    return this.http.get<PortfolioApiResponse<Portfolio>>(this.apiUrl)
      .pipe(
        map(response => response.data),
        catchError(error => {
          console.warn('API failed, constructing portfolio from local assets', error);
          return this.constructPortfolioFromAssets();
        })
      );
  }

  private constructPortfolioFromAssets(): Observable<Portfolio> {
    // Load all asset files and construct portfolio
    const summary$ = this.loadAssetFile('summary.json');
    const experience$ = this.loadAssetFile('experience.json');
    const education$ = this.loadAssetFile('education.json'); 
    const skills$ = this.loadAssetFile('skills.json');
    const highlights$ = this.loadAssetFile('highlights.json');

    return of(null).pipe(
      // This would be implemented with forkJoin in a real app
      // For now, return a mock portfolio
      map(() => this.createMockPortfolio())
    );
  }

  private loadAssetFile(filename: string): Observable<any> {
    return this.http.get(`${this.assetsUrl}/${filename}`)
      .pipe(
        catchError(error => {
          console.warn(`Failed to load ${filename}`, error);
          return of({});
        })
      );
  }

  private getLocalSection(section: string): Observable<ContentSection> {
    return this.loadAssetFile(`${section}.json`).pipe(
      map(data => ({
        section: section as any,
        items: Array.isArray(data) ? data : data.items || [],
        totalItems: Array.isArray(data) ? data.length : data.items?.length || 0,
        displayOrder: 'chronological' as const,
        lastUpdated: new Date().toISOString()
      }))
    );
  }

  private getLocalSkills(category?: string): Observable<SkillsResponse> {
    return this.loadAssetFile('skills.json').pipe(
      map(data => {
        const skills = data.skills || data;
        const filteredSkills = category ? skills.filter((s: any) => s.category === category) : skills;
        
        return {
          categories: data.categories || [],
          totalSkills: filteredSkills.length,
          yearsExperience: Math.max(...filteredSkills.map((s: any) => s.yearsExperience || 0)),
          primarySkills: filteredSkills.filter((s: any) => s.level === 'expert')
        };
      })
    );
  }

  private getLocalExperience(): Observable<ExperienceResponse> {
    return this.loadAssetFile('experience.json').pipe(
      map(data => {
        const positions = Array.isArray(data) ? data : data.positions || [];
        const technologies = new Set();
        const companies = new Set();
        
        positions.forEach((pos: any) => {
          companies.add(pos.company);
          pos.technologies?.forEach((tech: string) => technologies.add(tech));
        });

        return {
          positions,
          totalYears: this.calculateTotalExperience(positions),
          companies: Array.from(companies),
          technologies: Array.from(technologies)
        };
      })
    );
  }

  private getLocalHighlights(): Observable<HighlightsResponse> {
    return this.loadAssetFile('highlights.json').pipe(
      map(data => {
        const achievements = Array.isArray(data) ? data : data.highlights || [];
        const categories = [...new Set(achievements.map((h: any) => h.category))];
        const recentHighlights = achievements
          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 5);

        return {
          achievements,
          categories,
          recentHighlights
        };
      })
    );
  }

  private performLocalSearch(portfolio: Portfolio, query: string): any[] {
    const results: any[] = [];
    const lowerQuery = query.toLowerCase();

    // Search in experience
    portfolio.experience.forEach(exp => {
      if (exp.company.toLowerCase().includes(lowerQuery) ||
          exp.position.toLowerCase().includes(lowerQuery) ||
          exp.responsibilities.some(r => r.toLowerCase().includes(lowerQuery))) {
        results.push({ type: 'experience', data: exp });
      }
    });

    // Search in skills
    const allSkills = [...portfolio.skills.frontend, ...portfolio.skills.backend, ...portfolio.skills.tools];
    allSkills.forEach(skill => {
      if (skill.name.toLowerCase().includes(lowerQuery)) {
        results.push({ type: 'skill', data: skill });
      }
    });

    // Search in highlights
    portfolio.highlights.forEach(highlight => {
      if (highlight.title.toLowerCase().includes(lowerQuery) ||
          highlight.description.toLowerCase().includes(lowerQuery)) {
        results.push({ type: 'highlight', data: highlight });
      }
    });

    return results;
  }

  private calculateTotalExperience(positions: any[]): number {
    // Simple calculation - in a real app this would be more sophisticated
    return positions.length > 0 ? Math.max(...positions.map(p => {
      const start = new Date(p.duration.start);
      const end = p.duration.end === 'present' ? new Date() : new Date(p.duration.end);
      return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
    })) : 0;
  }

  private createMockPortfolio(): Portfolio {
    // Create a basic mock portfolio structure
    return {
      id: 'joseph-lee-portfolio',
      owner: {
        name: 'Joseph Lee',
        title: 'Frontend Developer',
        location: 'San Francisco, CA'
      },
      summary: {
        headline: 'Frontend Developer specializing in Angular & TypeScript',
        overview: 'Passionate about creating exceptional user experiences with modern web technologies.',
        careerPath: 'Frontend development with focus on Angular, React, and TypeScript',
        yearsExperience: 5,
        specializations: ['Angular', 'TypeScript', 'UI/UX Design']
      },
      experience: [],
      education: [],
      skills: {
        frontend: [],
        backend: [],
        tools: [],
        soft: [],
        categories: []
      },
      highlights: [],
      metadata: {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        totalExperience: 5,
        primarySkills: ['Angular', 'TypeScript', 'JavaScript'],
        industries: ['Technology', 'Web Development']
      }
    };
  }
}