// ─── Auth & User ─────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  display_name: string;
  role: 'student' | 'admin';
  created_at?: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
}

// ─── Assessment Inputs ────────────────────────────────────────────────────────
export interface Grades {
  math: number;
  science: number;
  english: number;
  filipinoAp: number;
  tle: number;
}

export type RIASECKey =
  | 'realistic'
  | 'investigative'
  | 'artistic'
  | 'social'
  | 'enterprising'
  | 'conventional';

export type RIASECScores = Record<RIASECKey, number>;

export type ProblemType = 'puzzles' | 'people' | 'tools' | 'business';
export type AfterGrade12 = 'college' | 'tesda' | 'business' | 'unsure';
export type ClassPick = 'lab' | 'debate' | 'accounting' | 'workshop';
export type Constraint = 'none' | 'budget' | 'offerings' | 'family';
export type LifePriority = 'income' | 'meaning' | 'both';
export type LocationPref = 'city' | 'hometown' | 'open';
export type GradeSource = 'reportCard' | 'estimate' | '';

/** Work-style and values answers. Saved in `aptitude_ratings` JSONB. */
export interface WorkProfile {
  problemType: ProblemType | '';
  afterGrade12: AfterGrade12 | '';
  classPick: ClassPick | '';
  constraint: Constraint | '';
  priority: LifePriority | '';
  location: LocationPref | '';
  targetCourse: string;
  gradeSource: GradeSource;
}

/** @deprecated Old self-rated aptitude shape — still present on saved records. */
export interface LegacyAptitudeRatings {
  logical?: number;
  spatial?: number;
  linguistic?: number;
}

export type AptitudeRatings = WorkProfile & LegacyAptitudeRatings;

export interface FISInput {
  grades: Grades;
  riasecScores: RIASECScores;
  profile: WorkProfile;
}

export type StrandKey = 'STEM' | 'ABM' | 'HUMSS' | 'TVL' | 'GAS';

export interface FISResult {
  strand: StrandKey;
  degreeOfMatch: number;
  drivenBy: string[];
  closeCall?: boolean;
  hollandCode?: string;
  counselorNote?: string;
  targetStrand?: StrandKey | null;
}

export interface Assessment {
  id: string;
  user_id: string;
  grades: Grades;
  riasec_scores: RIASECScores;
  aptitude_ratings: AptitudeRatings;
  recommendations: FISResult[];
  created_at: string;
  display_name?: string;
  email?: string;
}

export type RIASECAnswers = Record<string, number>;
