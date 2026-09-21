import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, Alert, BackHandler,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, interpolate,
  FadeIn, FadeOut,
} from 'react-native-reanimated';
import CustomSlider from '../components/CustomSlider';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../constants/design';
import RobotMascot from '../components/RobotMascot';
import {
  ALL_RIASEC_QUESTIONS, GRADE_QUESTIONS, LIKERT_OPTIONS,
  SCENARIO_QUESTIONS, VALUE_QUESTIONS, GRADE_SOURCE_QUESTION, shuffleQuestions, ChoiceOption,
} from '../data/questions';
import { runFIS, computeRIASECScores } from '../fuzzy/fis';
import { Grades, RIASECAnswers, WorkProfile } from '../types';

const GRADE_STEPS = GRADE_QUESTIONS.length;
const GRADE_SOURCE_STEPS = 1;
const RIASEC_STEPS = ALL_RIASEC_QUESTIONS.length;
const SCENARIO_STEPS = SCENARIO_QUESTIONS.length;
const VALUE_STEPS = VALUE_QUESTIONS.length;
const TOTAL_STEPS = GRADE_STEPS + GRADE_SOURCE_STEPS + RIASEC_STEPS + SCENARIO_STEPS + VALUE_STEPS;

const EMPTY_PROFILE: WorkProfile = {
  problemType: '',
  afterGrade12: '',
  classPick: '',
  constraint: '',
  priority: '',
  location: '',
  targetCourse: '',
  gradeSource: '',
};

function gradeLabel(g: number): string {
  if (g < 75) return 'NEEDS IMPROVEMENT';
  if (g < 80) return 'SATISFACTORY';
  if (g < 87) return 'GOOD';
  if (g < 93) return 'VERY GOOD';
  return 'EXCELLENT';
}

function phaseFor(step: number): string {
  if (step < GRADE_STEPS + GRADE_SOURCE_STEPS) return `Grades · ${step + 1}/${GRADE_STEPS + GRADE_SOURCE_STEPS}`;
  if (step < GRADE_STEPS + GRADE_SOURCE_STEPS + RIASEC_STEPS) {
    const n = step - GRADE_STEPS - GRADE_SOURCE_STEPS + 1;
    return `Interests · ${n}/${RIASEC_STEPS}`;
  }
  if (step < GRADE_STEPS + GRADE_SOURCE_STEPS + RIASEC_STEPS + SCENARIO_STEPS) {
    const n = step - GRADE_STEPS - GRADE_SOURCE_STEPS - RIASEC_STEPS + 1;
    return `How you work · ${n}/${SCENARIO_STEPS}`;
  }
  const n = step - GRADE_STEPS - GRADE_SOURCE_STEPS - RIASEC_STEPS - SCENARIO_STEPS + 1;
  return `Your plans · ${n}/${VALUE_STEPS}`;
}

export default function AssessmentScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [riasecOrder] = useState(() => shuffleQuestions(ALL_RIASEC_QUESTIONS));
  const [grades, setGrades] = useState<Grades>({
    math: 80, science: 80, english: 80, filipinoAp: 80, tle: 80,
  });
  const [riasecAnswers, setRiasecAnswers] = useState<RIASECAnswers>({});
  const [profile, setProfile] = useState<WorkProfile>(EMPTY_PROFILE);

  const progress = useSharedValue(0);
  React.useEffect(() => {
    progress.value = withTiming((step + 1) / TOTAL_STEPS, { duration: 350 });
  }, [step]);
  const barStyle = useAnimatedStyle(() => ({
    width: `${interpolate(progress.value, [0, 1], [0, 100])}%`,
  }));

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (step > 0) { goBack(); return true; }
        return false;
      });
      return () => sub.remove();
    }, [step])
  );

  function goBack() {
    if (step === 0) { router.back(); return; }
    setStep(step - 1);
  }

  function goNext() {
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
    else finishAssessment();
  }

  function handleExitConfirm() {
    Alert.alert(
      'Exit Assessment',
      'Are you sure? Your progress will be lost.',
      [
        { text: 'Keep Going', style: 'cancel' },
        { text: 'Exit', style: 'destructive', onPress: () => router.back() },
      ]
    );
  }

  function finishAssessment() {
    const riasecScores = computeRIASECScores(riasecAnswers);
    const results = runFIS({ grades, riasecScores, profile });
    router.push({
      pathname: '/results',
      params: {
        results: JSON.stringify(results),
        grades: JSON.stringify(grades),
        riasecScores: JSON.stringify(riasecScores),
        aptitude: JSON.stringify(profile),
      },
    });
  }

  function renderStep() {
    if (step < GRADE_STEPS) {
      const { field, question } = GRADE_QUESTIONS[step];
      return (
        <GradeSliderStep
          question={question}
          value={grades[field]}
          onChange={(v) => setGrades((g) => ({ ...g, [field]: v }))}
          onNext={goNext}
        />
      );
    }

    if (step < GRADE_STEPS + GRADE_SOURCE_STEPS) {
      return (
        <ChoiceStep
          question={GRADE_SOURCE_QUESTION.question}
          selected={profile.gradeSource || null}
          options={[...GRADE_SOURCE_QUESTION.options]}
          onSelect={(v) => setProfile((p) => ({ ...p, gradeSource: v as WorkProfile['gradeSource'] }))}
          onNext={goNext}
          canContinue={!!profile.gradeSource}
        />
      );
    }

    if (step < GRADE_STEPS + GRADE_SOURCE_STEPS + RIASEC_STEPS) {
      const qIdx = step - GRADE_STEPS - GRADE_SOURCE_STEPS;
      const qInfo = riasecOrder[qIdx];
      const current = riasecAnswers[qInfo.id] ?? null;
      return (
        <ChoiceStep
          question={qInfo.text}
          selected={current == null ? null : String(current)}
          options={LIKERT_OPTIONS.map((o) => ({
            value: String(o.value),
            label: o.label,
            emoji: o.emoji,
          }))}
          onSelect={(v) => setRiasecAnswers((prev) => ({ ...prev, [qInfo.id]: Number(v) }))}
          onNext={goNext}
          canContinue={current != null}
        />
      );
    }

    if (step < GRADE_STEPS + GRADE_SOURCE_STEPS + RIASEC_STEPS + SCENARIO_STEPS) {
      const idx = step - GRADE_STEPS - GRADE_SOURCE_STEPS - RIASEC_STEPS;
      const q = SCENARIO_QUESTIONS[idx];
      const current = profile[q.field];
      return (
        <ChoiceStep
          question={q.question}
          selected={current || null}
          options={q.options}
          onSelect={(v) => setProfile((p) => ({ ...p, [q.field]: v }))}
          onNext={goNext}
          canContinue={!!current}
        />
      );
    }

    const idx = step - GRADE_STEPS - GRADE_SOURCE_STEPS - RIASEC_STEPS - SCENARIO_STEPS;
    const q = VALUE_QUESTIONS[idx];
    const current = profile[q.field];
    return (
      <ChoiceStep
        question={q.question}
        selected={current || null}
        options={q.options}
        onSelect={(v) => setProfile((p) => ({ ...p, [q.field]: v }))}
        onNext={goNext}
        canContinue={!!current}
      />
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.topBar}>
        <TouchableOpacity onPress={goBack} style={styles.topBarBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.topBarBtnText}>‹</Text>
        </TouchableOpacity>

        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, barStyle]} />
        </View>

        <TouchableOpacity onPress={handleExitConfirm} style={styles.topBarBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.topBarBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.stepCounter}>{phaseFor(step)} · {step + 1}/{TOTAL_STEPS}</Text>

      <Animated.View
        key={step}
        entering={FadeIn.duration(220)}
        exiting={FadeOut.duration(150)}
        style={{ flex: 1 }}
      >
        {renderStep()}
      </Animated.View>
    </View>
  );
}

function GradeSliderStep({
  question, value, onChange, onNext,
}: {
  question: string; value: number;
  onChange: (v: number) => void; onNext: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.stepContainer}>
      <RobotMascot size={64} />
      <View style={styles.bubble}>
        <Text style={styles.bubbleText}>{question}</Text>
      </View>
      <Text style={styles.gradeHint}>Ilagay ang average grade mo sa huling dalawang quarter.</Text>

      <View style={styles.gradeDisplay}>
        <Text style={styles.gradeNumber}>{value}</Text>
        <Text style={styles.gradeLabel}>{gradeLabel(value)}</Text>
      </View>

      <CustomSlider
        style={styles.slider}
        minimumValue={60}
        maximumValue={100}
        step={1}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={COLORS.primary}
        maximumTrackTintColor={COLORS.border}
        thumbTintColor={COLORS.primary}
      />

      <View style={styles.sliderLabels}>
        <Text style={styles.sliderLabelText}>60</Text>
        <Text style={styles.sliderLabelText}>100</Text>
      </View>

      <TouchableOpacity style={styles.continueBtn} onPress={onNext} activeOpacity={0.85}>
        <Text style={styles.continueBtnText}>Continue ›</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function ChoiceStep({
  question, selected, options, onSelect, onNext, canContinue,
}: {
  question: string;
  selected: string | null;
  options: ChoiceOption[];
  onSelect: (v: string) => void;
  onNext: () => void;
  canContinue: boolean;
}) {
  return (
    <ScrollView contentContainerStyle={styles.stepContainer}>
      <RobotMascot size={56} />
      <View style={styles.bubble}>
        <Text style={styles.bubbleText}>{question}</Text>
      </View>

      <View style={styles.optionsList}>
        {options.map((opt) => {
          const isSelected = selected === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.optionCard, isSelected && styles.optionCardSelected]}
              onPress={() => onSelect(opt.value)}
              activeOpacity={0.8}
            >
              <Text style={styles.optionEmoji}>{opt.emoji}</Text>
              <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                {opt.label}
              </Text>
              {isSelected && (
                <View style={styles.checkCircle}>
                  <Text style={styles.checkCircleText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[styles.continueBtn, !canContinue && styles.continueBtnDisabled]}
        onPress={onNext}
        disabled={!canContinue}
        activeOpacity={0.85}
      >
        <Text style={styles.continueBtnText}>Continue ›</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.white },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: 52,
    paddingBottom: SPACING.sm,
    gap: SPACING.md,
    backgroundColor: COLORS.white,
  },
  topBarBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center',
  },
  topBarBtnText: { fontSize: FONT_SIZE.xl, color: COLORS.text, lineHeight: 28 },
  progressTrack: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
  },
  stepCounter: {
    textAlign: 'center',
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
    fontWeight: '600',
  },
  stepContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 40,
  },
  bubble: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.md,
    borderTopLeftRadius: 4,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  bubbleText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.text,
    fontWeight: '600',
    lineHeight: 26,
  },
  gradeHint: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: -SPACING.md,
    marginBottom: SPACING.md,
  },
  gradeDisplay: {
    alignItems: 'center',
    marginVertical: SPACING.xl,
  },
  gradeNumber: {
    fontSize: 72,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: -2,
  },
  gradeLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  slider: {
    width: '100%',
    height: 44,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -4,
    marginBottom: SPACING.xl,
  },
  sliderLabelText: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, fontWeight: '600' },
  optionsList: { gap: SPACING.sm, marginBottom: SPACING.lg },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    backgroundColor: COLORS.white,
  },
  optionCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  optionEmoji: { fontSize: 22, width: 28, textAlign: 'center' },
  optionLabel: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    fontWeight: '500',
  },
  optionLabelSelected: { color: COLORS.primary, fontWeight: '700' },
  checkCircle: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  checkCircleText: { color: COLORS.white, fontSize: FONT_SIZE.sm, fontWeight: '700' },
  continueBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  continueBtnDisabled: { backgroundColor: COLORS.border },
  continueBtnText: { color: COLORS.white, fontSize: FONT_SIZE.lg, fontWeight: '700' },
});
