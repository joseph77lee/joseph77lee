// Portfolio data models based on resume content

export interface Portfolio {
  id: string;
  owner: PersonalInfo;
  summary: ProfessionalSummary;
  experience: WorkExperience[];
  education: Education[];
  skills: SkillSet;
  highlights: Highlight[];
  metadata: PortfolioMetadata;
}

export interface PersonalInfo {
  name: string;
  title: string;
  location: string;
  email?: string;
  linkedin?: string;
  github?: string;
  website?: string;
}

export interface ProfessionalSummary {
  headline: string;
  overview: string;
  careerPath: string;
  yearsExperience: number;
  specializations: string[];
}

export interface WorkExperience {
  id: string;
  company: string;
  position: string;
  duration: DateRange;
  location: string;
  responsibilities: string[];
  technologies: string[];
  achievements: string[];
  type: 'full-time' | 'part-time' | 'contract' | 'freelance';
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  duration: DateRange;
  location: string;
  gpa?: number;
  honors?: string[];
  relevantCourses?: string[];
}

export interface SkillSet {
  frontend: Skill[];
  backend: Skill[];
  tools: Skill[];
  soft: Skill[];
  categories: SkillCategory[];
}

export interface Skill {
  name: string;
  level: SkillLevel;
  yearsExperience: number;
  category: string;
  description?: string;
  projects?: string[];
}

export interface SkillCategory {
  name: string;
  displayName: string;
  description: string;
  skills: string[];
  color?: string;
}

export interface Highlight {
  id: string;
  title: string;
  description: string;
  category: 'achievement' | 'project' | 'certification' | 'award';
  date: string;
  relevance: number; // 1-10 for sorting by importance
  technologies?: string[];
  metrics?: string[];
}

export interface DateRange {
  start: string; // ISO date string
  end: string | 'present';
  display: string; // Human readable format
}

export interface PortfolioMetadata {
  version: string;
  lastUpdated: string;
  totalExperience: number;
  primarySkills: string[];
  industries: string[];
  resumeUrl?: string;
}

export interface ContentSection {
  section: 'summary' | 'experience' | 'education' | 'skills' | 'highlights';
  items: any[];
  totalItems: number;
  displayOrder: 'chronological' | 'relevance' | 'alphabetical';
  lastUpdated: string;
}

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

// Command-specific response types
export interface SkillsResponse {
  categories: SkillCategory[];
  totalSkills: number;
  yearsExperience: number;
  primarySkills: Skill[];
}

export interface ExperienceResponse {
  positions: WorkExperience[];
  totalYears: number;
  companies: string[];
  technologies: string[];
}

export interface HighlightsResponse {
  achievements: Highlight[];
  categories: string[];
  recentHighlights: Highlight[];
}

// Portfolio API response wrapper
export interface PortfolioApiResponse<T = any> {
  success: boolean;
  data: T;
  metadata?: {
    timestamp: string;
    version: string;
    cacheHit?: boolean;
  };
}

// Error response for portfolio data
export interface PortfolioError {
  code: string;
  message: string;
  section?: string;
  suggestion?: string;
}