/** Explainable Mamdani-style fuzzy inference for SHS pathway guidance. */
import { ALL_RIASEC_QUESTIONS, COURSE_TO_STRAND, RIASEC_DIMENSIONS } from '../data/questions';
import { FISInput, FISResult, Grades, RIASECAnswers, RIASECKey, RIASECScores, StrandKey, WorkProfile } from '../types';

const STRANDS: StrandKey[] = ['STEM', 'ABM', 'HUMSS', 'TVL', 'GAS'];
const and = (...values: number[]) => Math.min(...values);
const or = (...values: number[]) => Math.max(...values);
const boundedSum = (values: number[]) => values.reduce((total, value) => total + value - total * value, 0);

function trapezoid(x: number, a: number, b: number, c: number, d: number) {
  if (x <= a || x >= d) return 0;
  if (x >= b && x <= c) return 1;
  return x < b ? (x - a) / (b - a) : (d - x) / (d - c);
}

// Overlapping bands: a solid 82 is still Medium and beginning to become High.
const low = (x: number) => x <= 72 ? 1 : x >= 78 ? 0 : (78 - x) / 6;
const medium = (x: number) => trapezoid(x, 72, 78, 84, 88);
const high = (x: number) => trapezoid(x, 82, 87, 93, 97);
const veryHigh = (x: number) => x <= 90 ? 0 : x >= 95 ? 1 : (x - 90) / 5;
const value = (n: number | undefined, fallback = 80) => typeof n === 'number' && !Number.isNaN(n) ? n : fallback;

interface FiredRule { strand: StrandKey; strength: number; drivenBy: string[] }

function strongestInterest(scores: RIASECScores) {
  return RIASEC_DIMENSIONS.reduce((best, key) => scores[key] > scores[best] ? key : best, 'investigative' as RIASECKey);
}

function hollandCode(scores: RIASECScores): string {
  const letters: Record<RIASECKey, string> = { realistic: 'R', investigative: 'I', artistic: 'A', social: 'S', enterprising: 'E', conventional: 'C' };
  return [...RIASEC_DIMENSIONS].sort((a, b) => scores[b] - scores[a]).slice(0, 3).map((key) => letters[key]).join('');
}

function profileAffinity(profile: WorkProfile, strand: StrandKey): number {
  const affinities: Record<StrandKey, Record<string, number>> = {
    STEM: { puzzles: 0.9, lab: 0.9, workshop: 0.15, college: 0.2 },
    ABM: { business: 0.9, accounting: 0.9, college: 0.15 },
    HUMSS: { people: 0.9, debate: 0.9, college: 0.15 },
    TVL: { tools: 0.9, workshop: 0.9, tesda: 1, college: 0.1 },
    GAS: { unsure: 1 },
  };
  const map = affinities[strand];
  return or(map[profile.problemType] ?? 0, map[profile.classPick] ?? 0, map[profile.afterGrade12] ?? 0);
}

function fireRules(grades: Grades, riasec: RIASECScores, profile: WorkProfile): FiredRule[] {
  const math = value(grades.math), science = value(grades.science), english = value(grades.english);
  const filipinoAp = value(grades.filipinoAp, english), tle = value(grades.tle);
  // Estimated grades remain useful, but carry less weight than report-card grades.
  const gradeWeight = profile.gradeSource === 'estimate' ? 0.7 : 1;
  const gLow = (score: number) => gradeWeight * low(score);
  const gMedium = (score: number) => gradeWeight * medium(score);
  const gHigh = (score: number) => gradeWeight * high(score);
  const gVeryHigh = (score: number) => gradeWeight * veryHigh(score);
  const R = riasec.realistic, I = riasec.investigative, A = riasec.artistic, S = riasec.social, E = riasec.enterprising, C = riasec.conventional;
  const strongest = strongestInterest(riasec);
  const interestChip = `${strongest[0].toUpperCase()}${strongest.slice(1)} is your strongest interest`;
  const stemChoice = profileAffinity(profile, 'STEM');
  const abmChoice = profileAffinity(profile, 'ABM');
  const humssChoice = profileAffinity(profile, 'HUMSS');
  const tvlChoice = profileAffinity(profile, 'TVL');
  const fired: FiredRule[] = [];
  const rule = (strand: StrandKey, strength: number, drivenBy: string[]) => { if (strength > 0.04) fired.push({ strand, strength, drivenBy }); };
  const grade = (name: string, score: number) => `${name} ${Math.round(score)}`;
  const languageHigh = or(gHigh(english), gHigh(filipinoAp));

  // Similar number of independent rules per pathway prevents rule-count bias.
  rule('STEM', and(or(gHigh(math), gHigh(science)), high(I)), [grade('Math', math), grade('Science', science), 'Investigative interest']);
  rule('STEM', and(gHigh(math), gHigh(science)), [grade('Math', math), grade('Science', science)]);
  rule('STEM', and(stemChoice, or(high(I), gHigh(math), gHigh(science))), [profile.classPick === 'lab' ? 'You chose a research lab' : 'You prefer puzzles and proofs', interestChip]);
  rule('STEM', and(gVeryHigh(math), high(I)), [grade('Math', math), 'Investigative interest']);

  rule('ABM', and(high(E), high(C)), ['Enterprising interest', 'Conventional (detail) interest']);
  rule('ABM', and(high(E), or(gMedium(math), gHigh(math))), ['Enterprising interest', grade('Math', math)]);
  rule('ABM', and(abmChoice, or(high(E), high(C), gHigh(math))), [profile.classPick === 'accounting' ? 'You chose accounting / business' : 'You prefer plans and money', grade('Math', math)]);
  rule('ABM', and(profile.afterGrade12 === 'business' ? 1 : 0, or(high(E), high(C))), ['You are considering a business after Grade 12', interestChip]);

  rule('HUMSS', and(high(S), languageHigh), ['Social interest', gHigh(english) >= gHigh(filipinoAp) ? grade('English', english) : grade('Filipino / AP', filipinoAp)]);
  rule('HUMSS', and(humssChoice, or(high(S), languageHigh)), [profile.classPick === 'debate' ? 'You chose debate / social issues' : 'You prefer people and stories']);
  rule('HUMSS', and(high(S), high(A), languageHigh), ['Social interest', 'Artistic interest', grade('English', english)]);
  rule('HUMSS', and(profile.priority === 'meaning' ? 1 : 0, high(S)), ['You value meaning and service', 'Social interest']);

  rule('TVL', and(high(R), or(gHigh(tle), tvlChoice)), ['Realistic interest', profile.classPick === 'workshop' ? 'You chose a workshop / shop class' : grade('TLE / ICT', tle)]);
  rule('TVL', and(tvlChoice, or(high(R), gHigh(tle))), [profile.afterGrade12 === 'tesda' ? 'You lean toward TESDA or work after Grade 12' : 'You prefer tools and builds']);
  rule('TVL', and(gVeryHigh(tle), or(high(R), medium(R))), [grade('TLE / ICT', tle), 'Realistic interest']);
  rule('TVL', and(high(R), profile.constraint === 'family' ? 1 : 0), ['Realistic interest', 'Family work or a trade is part of the picture']);

  const riasecValues = RIASEC_DIMENSIONS.map((key) => riasec[key]);
  const mean = riasecValues.reduce((sum, score) => sum + score, 0) / riasecValues.length;
  const spread = Math.sqrt(riasecValues.reduce((sum, score) => sum + (score - mean) ** 2, 0) / riasecValues.length);
  const flatProfile = Math.max(0, Math.min(1, (12 - spread) / 12));
  rule('GAS', flatProfile, ['Your interests are evenly spread']);
  rule('GAS', profile.afterGrade12 === 'unsure' ? 0.8 : 0, ['You want to keep options open after Grade 12']);
  rule('GAS', and(gMedium(math), gMedium(science), gMedium(english)), ['Solid, balanced grades across subjects']);
  rule('GAS', profile.constraint === 'budget' ? 0.25 : 0, ['Budget is a factor — GAS can preserve flexible options']);

  return fired;
}

function normalize(strengths: number[]): number[] {
  const total = strengths.reduce((sum, strength) => sum + strength, 0);
  if (!total) return [20, 20, 20, 20, 20];
  const rounded = strengths.map((strength) => Math.round((strength / total) * 1000) / 10);
  const difference = Math.round((100 - rounded.reduce((sum, score) => sum + score, 0)) * 10) / 10;
  rounded[rounded.indexOf(Math.max(...rounded))] += difference;
  return rounded;
}

export function runFIS(input: FISInput): FISResult[] {
  const profile = input.profile;
  const fired = fireRules(input.grades, input.riasecScores, profile);
  const raw = new Map<StrandKey, { strength: number; labels: string[] }>();
  for (const strand of STRANDS) {
    const rules = fired.filter((item) => item.strand === strand).sort((a, b) => b.strength - a.strength);
    raw.set(strand, { strength: boundedSum(rules.map((item) => item.strength)), labels: [...new Set(rules.flatMap((item) => item.drivenBy))].slice(0, 4) });
  }

  // Mismatch penalties are applied after all positive evidence is combined.
  const gradeWeight = profile.gradeSource === 'estimate' ? 0.7 : 1;
  raw.get('STEM')!.strength *= 1 - 0.72 * gradeWeight * low(value(input.grades.math));
  raw.get('HUMSS')!.strength *= 1 - 0.55 * gradeWeight * and(low(value(input.grades.english)), low(value(input.grades.filipinoAp, input.grades.english)));
  raw.get('ABM')!.strength *= 1 - 0.45 * and(low(input.riasecScores.enterprising), low(input.riasecScores.conventional), gradeWeight * low(value(input.grades.math)));
  if (profile.afterGrade12 === 'college' && low(input.riasecScores.realistic) > 0.6) raw.get('TVL')!.strength *= 0.7;

  const targetStrand = COURSE_TO_STRAND[profile.targetCourse] ?? null;
  if (targetStrand) raw.get(targetStrand)!.labels.unshift(`You named ${profile.targetCourse}`);

  const fuzzyPercentages = normalize(STRANDS.map((strand) => raw.get(strand)!.strength));
  // A stated course goal is a strong prior, blended after—not allowed to replace—fuzzy evidence.
  const percentages = STRANDS.map((strand, index) => targetStrand ? Math.round((0.7 * fuzzyPercentages[index] + 0.3 * (strand === targetStrand ? 100 : 0)) * 10) / 10 : fuzzyPercentages[index]);
  const results: FISResult[] = STRANDS.map((strand, index) => ({ strand, degreeOfMatch: percentages[index], drivenBy: raw.get(strand)!.labels }));
  results.sort((a, b) => b.degreeOfMatch - a.degreeOfMatch);
  results[0].closeCall = results[0].degreeOfMatch - results[1].degreeOfMatch < 10;
  results[0].hollandCode = hollandCode(input.riasecScores);
  results[0].targetStrand = targetStrand;
  const notes: string[] = [];
  if (results[0].closeCall) notes.push(`Your top two pathways (${results[0].strand} and ${results[1].strand}) are close. Talk with your guidance counselor before deciding.`);
  if (targetStrand && targetStrand !== results[0].strand) notes.push(`You named ${profile.targetCourse}, which usually maps to ${targetStrand}; your profile currently ranks ${results[0].strand} highest.`);
  if (profile.constraint === 'offerings') notes.push('Confirm which pathways or electives your school actually offers before making a final choice.');
  if (notes.length) results[0].counselorNote = notes.join(' ');
  return results;
}

/** Score Holland dimensions from raw Likert answers (1–5), applying reverse items. */
export function computeRIASECScores(answers: RIASECAnswers): RIASECScores {
  const scores = {} as RIASECScores;
  for (const dimension of RIASEC_DIMENSIONS) {
    const values = ALL_RIASEC_QUESTIONS.filter((question) => question.dimension === dimension).map((question) => {
      const answer = answers[question.id];
      return answer == null ? null : question.reversed ? 6 - answer : answer;
    }).filter((answer): answer is number => answer != null);
    scores[dimension] = values.length ? Math.round((values.reduce((sum, score) => sum + score, 0) / values.length) * 200) / 10 : 0;
  }
  return scores;
}
