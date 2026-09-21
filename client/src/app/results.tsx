import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator,
} from 'react-native';
import { Toast, ToastVariant } from '../components/Toast';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../constants/design';
import { FISResult, Grades, RIASECScores, AptitudeRatings } from '../types';
import { CAREER_PATHS } from '../data/careerPaths';
import { useAuth } from '../context/AuthContext';
import { apiPost } from '../services/api';

export default function ResultsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const params = useLocalSearchParams<{
    results: string;
    grades: string;
    riasecScores: string;
    aptitude: string;
    readOnly?: string;
    studentName?: string;
  }>();

  const results: FISResult[] = JSON.parse(params.results ?? '[]');
  const grades: Grades = JSON.parse(params.grades ?? '{}');
  const riasecScores: RIASECScores = JSON.parse(params.riasecScores ?? '{}');
  const aptitude: AptitudeRatings = JSON.parse(params.aptitude ?? '{}');
  const isReadOnly = params.readOnly === 'true';
  const studentName = params.studentName;

  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [toast, setToast]   = useState<{ visible: boolean; variant: ToastVariant; title: string; desc?: string }>({
    visible: false, variant: 'success', title: '',
  });

  function showToast(variant: ToastVariant, title: string, desc?: string) {
    setToast({ visible: true, variant, title, desc });
  }

  async function handleSave() {
    if (!token) { showToast('warning', 'Not signed in', 'Please log in to save results.'); return; }
    setSaving(true);
    try {
      await apiPost('/api/assessments', {
        grades,
        riasec_scores: riasecScores,
        aptitude_ratings: aptitude,
        recommendations: results,
      }, token);
      setSaved(true);
      showToast('success', 'Results Saved!', 'Redirecting to home…');
      setTimeout(() => router.replace('/(tabs)/home'), 1800);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save';
      showToast('error', 'Save Failed', msg);
    } finally {
      setSaving(false);
    }
  }

  const top = results[0];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <Toast
        visible={toast.visible}
        variant={toast.variant}
        title={toast.title}
        description={toast.desc}
        onDismiss={() => setToast(t => ({ ...t, visible: false }))}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{studentName ? `${studentName}'s Results` : 'Your Results'}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Top match banner */}
        {top && (
          <Animated.View
            entering={FadeInDown.delay(50).springify()}
            style={[styles.topBanner, { backgroundColor: CAREER_PATHS[top.strand]?.color ?? COLORS.primary }]}
          >
            <View style={styles.bestBadge}>
              <Text style={styles.bestBadgeText}>🏆 Best Match</Text>
            </View>
            <Text style={styles.topBannerIcon}>{CAREER_PATHS[top.strand]?.icon}</Text>
            <Text style={styles.topStrand}>{top.strand}</Text>
            <Text style={styles.topStrandFull}>{CAREER_PATHS[top.strand]?.fullName}</Text>
            <Text style={styles.topPct}>{top.degreeOfMatch}% of recommendation evidence</Text>
            {top.hollandCode ? (
              <Text style={styles.hollandCode}>Holland code {top.hollandCode}</Text>
            ) : null}
          </Animated.View>
        )}

        {top?.closeCall ? (
          <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.closeCall}>
            <Text style={styles.closeCallTitle}>Close call</Text>
            <Text style={styles.closeCallText}>
              {top.counselorNote ?? 'Your top two strands are close. Talk with your guidance counselor before you lock in.'}
            </Text>
          </Animated.View>
        ) : top?.counselorNote ? (
          <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.closeCall}>
            <Text style={styles.closeCallText}>{top.counselorNote}</Text>
          </Animated.View>
        ) : null}

        {/* Disclaimer */}
        <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
          ⚠ This is a decision-support tool. Please consult your school guidance counselor before making a final decision.
          </Text>
        </Animated.View>

        {/* All strand cards */}
        {results.map((r, i) => {
          const cp = CAREER_PATHS[r.strand];
          const color = cp?.color ?? COLORS.primary;
          return (
            <Animated.View
              key={r.strand}
              entering={FadeInDown.delay(200 + i * 80).springify()}
            >
              <TouchableOpacity
                style={styles.strandCard}
                onPress={() => router.push({ pathname: '/roadmap', params: { strand: r.strand } })}
                activeOpacity={0.82}
              >
                <View style={styles.strandCardLeft}>
                  <View style={[styles.rankBadge, { backgroundColor: i === 0 ? color : COLORS.background }]}>
                    <Text style={[styles.rankText, { color: i === 0 ? COLORS.white : COLORS.textSecondary }]}>
                      #{i + 1}
                    </Text>
                  </View>
                </View>

                <View style={styles.strandCardCenter}>
                  <View style={styles.strandNameRow}>
                    <Text style={styles.strandCardIcon}>{cp?.icon}</Text>
                    <View>
                      <Text style={styles.strandCardName}>{r.strand}</Text>
                      <Text style={styles.strandCardFull} numberOfLines={1}>{cp?.fullName}</Text>
                    </View>
                  </View>

                  {/* Progress bar */}
                  <View style={styles.barTrack}>
                    <Animated.View
                      style={[
                        styles.barFill,
                        { width: `${r.degreeOfMatch}%`, backgroundColor: color },
                      ]}
                    />
                  </View>
                  <Text style={[styles.pctLabel, { color }]}>{r.degreeOfMatch}% of recommendation evidence</Text>

                  {/* Driven-by chips */}
                  {r.drivenBy.length > 0 && (
                    <View style={styles.chipsRow}>
                      <Text style={styles.drivenLabel}>Driven by: </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {r.drivenBy.slice(0, 3).map((d) => (
                          <View key={d} style={[styles.chip, { borderColor: color }]}>
                            <Text style={[styles.chipText, { color }]}>{d}</Text>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}

        {/* Save button */}
        {!isReadOnly && (
          <Animated.View entering={FadeInDown.delay(700).springify()}>
            <TouchableOpacity
              style={[styles.saveBtn, (saving || saved) && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving || saved}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.saveBtnText}>
                  {saved ? '✓ Results Saved' : '💾 Save Results'}
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: 52,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { fontSize: FONT_SIZE.xl, color: COLORS.text, lineHeight: 28 },
  headerTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text },
  content: { padding: SPACING.lg, paddingBottom: 60, gap: SPACING.md },
  topBanner: {
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  bestBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    marginBottom: SPACING.sm,
  },
  bestBadgeText: { color: COLORS.white, fontSize: FONT_SIZE.sm, fontWeight: '700' },
  topBannerIcon: { fontSize: 48, marginBottom: SPACING.sm },
  topStrand: { fontSize: FONT_SIZE.xxxl, fontWeight: '900', color: COLORS.white, letterSpacing: -1 },
  topStrandFull: { fontSize: FONT_SIZE.sm, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: 4 },
  topPct: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.white, marginTop: SPACING.sm },
  hollandCode: { fontSize: FONT_SIZE.sm, color: 'rgba(255,255,255,0.85)', marginTop: 6, fontWeight: '600' },
  closeCall: {
    backgroundColor: '#EEF2FF',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  closeCallTitle: { fontSize: FONT_SIZE.sm, fontWeight: '800', color: '#3730A3', marginBottom: 4 },
  closeCallText: { fontSize: FONT_SIZE.sm, color: '#312E81', lineHeight: 20 },
  disclaimer: {
    backgroundColor: '#FFF8E7',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  disclaimerText: { fontSize: FONT_SIZE.sm, color: '#92400E', lineHeight: 20 },
  strandCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  strandCardLeft: { alignItems: 'center' },
  rankBadge: {
    width: 36, height: 36,
    borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  rankText: { fontSize: FONT_SIZE.sm, fontWeight: '800' },
  strandCardCenter: { flex: 1, gap: 6 },
  strandNameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  strandCardIcon: { fontSize: 24 },
  strandCardName: { fontSize: FONT_SIZE.lg, fontWeight: '800', color: COLORS.text },
  strandCardFull: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, maxWidth: 180 },
  barTrack: { height: 8, backgroundColor: COLORS.background, borderRadius: RADIUS.full, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: RADIUS.full },
  pctLabel: { fontSize: FONT_SIZE.xs, fontWeight: '700' },
  chipsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap' },
  drivenLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, flexShrink: 0 },
  chip: {
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    marginRight: 4,
  },
  chipText: { fontSize: 10, fontWeight: '600' },
  chevron: { fontSize: FONT_SIZE.xl, color: COLORS.textMuted },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  saveBtnDisabled: { backgroundColor: COLORS.success },
  saveBtnText: { color: COLORS.white, fontSize: FONT_SIZE.lg, fontWeight: '700' },
});
