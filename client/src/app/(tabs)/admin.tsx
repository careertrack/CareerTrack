import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity,
  StatusBar, RefreshControl, Alert, TextInput, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/design';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { apiGet, apiPatch } from '../../services/api';
import { Assessment, FISResult, User } from '../../types';
import { CAREER_PATHS } from '../../data/careerPaths';

function openAssessment(router: ReturnType<typeof useRouter>, a: Assessment) {
  const recs: FISResult[] = a.recommendations ?? [];
  router.push({
    pathname: '/results',
    params: {
      results: JSON.stringify(recs),
      grades: JSON.stringify(a.grades ?? {}),
      riasecScores: JSON.stringify(a.riasec_scores ?? {}),
      aptitude: JSON.stringify(a.aptitude_ratings ?? {}),
      readOnly: 'true',
      studentName: a.display_name ?? '',
    },
  });
}

type AdminTab = 'overview' | 'assessments' | 'users';

// ─── Bar Chart ────────────────────────────────────────────────────────────────
function StrandBarChart({ data }: { data: Record<string, number> }) {
  const max = Math.max(...Object.values(data), 1);
  const strands = ['STEM', 'ABM', 'HUMSS', 'TVL', 'GAS'];
  return (
    <View style={chart.container}>
      {strands.map((s) => {
        const count = data[s] ?? 0;
        const pct = (count / max) * 100;
        const color = CAREER_PATHS[s as keyof typeof CAREER_PATHS]?.color ?? COLORS.primary;
        return (
          <View key={s} style={chart.row}>
            <Text style={chart.label}>{s}</Text>
            <View style={chart.track}>
              <View style={[chart.fill, { width: `${pct}%`, backgroundColor: color }]} />
            </View>
            <Text style={[chart.count, { color }]}>{count}</Text>
          </View>
        );
      })}
    </View>
  );
}
const chart = StyleSheet.create({
  container: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  label: { width: 48, fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.text },
  track: { flex: 1, height: 12, backgroundColor: COLORS.background, borderRadius: RADIUS.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: RADIUS.full },
  count: { width: 28, fontSize: FONT_SIZE.xs, fontWeight: '700', textAlign: 'right' },
});

// ─── Main Admin Screen ────────────────────────────────────────────────────────
export default function AdminScreen() {
  const router = useRouter();
  const { token, user: me } = useAuth();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  async function loadAll() {
    if (!token) return;
    try {
      const [a, u] = await Promise.all([
        apiGet<Assessment[]>('/api/assessments', token),
        apiGet<User[]>('/api/users', token),
      ]);
      setAssessments(a);
      setUsers(u);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { loadAll(); }, [token]));

  function handleRefresh() { setRefreshing(true); loadAll(); }

  async function changeRole(userId: string, role: 'admin' | 'student') {
    if (userId === me?.id && role === 'student') {
      Alert.alert('Not allowed', 'You cannot demote yourself.');
      return;
    }
    try {
      const updated = await apiPatch<User>(`/api/users/${userId}/role`, { role }, token ?? undefined);
      setUsers((prev) => prev.map((u) => u.id === updated.id ? updated : u));
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed');
    }
  }

  // ── Overview data ──
  const strandDist: Record<string, number> = {};
  assessments.forEach((a) => {
    const top = (a.recommendations as { strand: string }[])[0]?.strand;
    if (top) strandDist[top] = (strandDist[top] ?? 0) + 1;
  });

  // ── Filtered assessments ──
  const filteredAssessments = assessments.filter((a) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      a.display_name?.toLowerCase().includes(s) ||
      a.email?.toLowerCase().includes(s) ||
      (a.recommendations as { strand: string }[])[0]?.strand?.toLowerCase().includes(s)
    );
  });

  const studentCount = users.filter((u) => u.role === 'student').length;
  const latestByUser = new Map<string, Assessment>();
  assessments.forEach((a) => {
    if (!latestByUser.has(a.user_id)) latestByUser.set(a.user_id, a);
  });

  const filteredUsers = users.filter((u) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return u.display_name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s);
  });

  const TABS: { key: AdminTab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'assessments', label: 'Assessments' },
    { key: 'users', label: 'Students' },
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>ADMIN</Text></View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabBtnText, tab === t.key && styles.tabBtnTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingCenter}><ActivityIndicator color={COLORS.primary} size="large" /></View>
      ) : (
        <>
          {tab === 'overview' && (
            <ScrollView
              contentContainerStyle={styles.content}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
            >
              {/* Stat Cards */}
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statNum}>{studentCount}</Text>
                  <Text style={styles.statLabel}>Students</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNum}>{assessments.length}</Text>
                  <Text style={styles.statLabel}>Assessments</Text>
                </View>
              </View>

              {/* Bar chart */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Strand Distribution</Text>
                <StrandBarChart data={strandDist} />
              </View>

              {/* Recent assessments */}
              <Text style={styles.sectionTitle}>Recent Assessments</Text>
              {assessments.slice(0, 5).map((a) => {
                const top = (a.recommendations as { strand: string; degreeOfMatch: number }[])[0];
                const cp = top ? CAREER_PATHS[top.strand as keyof typeof CAREER_PATHS] : null;
                return (
                  <TouchableOpacity key={a.id} style={styles.recentCard} onPress={() => openAssessment(router, a)} activeOpacity={0.85}>
                    <View style={[styles.avatarCircle, { backgroundColor: cp?.color ?? COLORS.primary }]}>
                      <Text style={styles.avatarText}>{a.display_name?.[0]?.toUpperCase() ?? '?'}</Text>
                    </View>
                    <View style={styles.recentInfo}>
                      <Text style={styles.recentName}>{a.display_name}</Text>
                      <Text style={styles.recentSub}>{top?.strand} · {top?.degreeOfMatch}%</Text>
                    </View>
                    <Text style={styles.recentDate}>
                      {new Date(a.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {tab === 'assessments' && (
            <View style={{ flex: 1 }}>
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.searchInput}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search by name, email, or strand…"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
              <FlatList
                data={filteredAssessments}
                keyExtractor={(item) => item.id}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
                contentContainerStyle={styles.content}
                renderItem={({ item: a }) => {
                  const top = (a.recommendations as { strand: string; degreeOfMatch: number }[])[0];
                  const cp = top ? CAREER_PATHS[top.strand as keyof typeof CAREER_PATHS] : null;
                  return (
                    <TouchableOpacity style={styles.assessmentRow} onPress={() => openAssessment(router, a)} activeOpacity={0.82}>
                      <View style={[styles.avatarCircle, { backgroundColor: cp?.color ?? COLORS.primary }]}>
                        <Text style={styles.avatarText}>{a.display_name?.[0]?.toUpperCase() ?? '?'}</Text>
                      </View>
                      <View style={styles.assessmentInfo}>
                        <Text style={styles.assessmentName}>{a.display_name}</Text>
                        <Text style={styles.assessmentEmail}>{a.email}</Text>
                        <Text style={styles.assessmentMeta}>
                          {new Date(a.created_at).toLocaleDateString('en-PH')} · {top?.strand} · {top?.degreeOfMatch}%
                        </Text>
                      </View>
                      <Text style={styles.assessmentChevron}>›</Text>
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={<Text style={styles.emptyText}>No assessments found.</Text>}
              />
            </View>
          )}

          {tab === 'users' && (
            <FlatList
              data={users}
              keyExtractor={(item) => item.id}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
              contentContainerStyle={styles.content}
              renderItem={({ item: u }) => {
                const isMe = u.id === me?.id;
                return (
                  <View style={styles.userRow}>
                    <View style={[styles.avatarCircle, { backgroundColor: u.role === 'admin' ? '#D97706' : COLORS.primary }]}>
                      <Text style={styles.avatarText}>{u.display_name[0]?.toUpperCase()}</Text>
                    </View>
                    <View style={styles.userInfo}>
                      <View style={styles.userNameRow}>
                        <Text style={styles.userName}>{u.display_name}</Text>
                        {isMe && <View style={styles.youBadge}><Text style={styles.youBadgeText}>YOU</Text></View>}
                        <View style={[styles.roleBadge, { backgroundColor: u.role === 'admin' ? '#FEF3C7' : COLORS.primaryLight }]}>
                          <Text style={[styles.roleBadgeText, { color: u.role === 'admin' ? '#D97706' : COLORS.primary }]}>
                            {u.role.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.userEmail}>{u.email}</Text>
                    </View>
                    <View style={styles.roleActions}>
                      {u.role === 'student' ? (
                        <TouchableOpacity
                          style={styles.promoteBtn}
                          onPress={() => changeRole(u.id, 'admin')}
                        >
                          <Text style={styles.promoteBtnText}>▲</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[styles.promoteBtn, styles.demoteBtn, isMe && styles.disabledBtn]}
                          onPress={() => !isMe && changeRole(u.id, 'student')}
                          disabled={isMe}
                        >
                          <Text style={[styles.promoteBtnText, { color: isMe ? COLORS.textMuted : COLORS.error }]}>▼</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              }}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.lg, paddingTop: 56, paddingBottom: SPACING.md,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.text, flex: 1 },
  adminBadge: { backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  adminBadgeText: { fontSize: 10, fontWeight: '800', color: COLORS.primary, letterSpacing: 1 },
  tabsRow: { flexDirection: 'row', backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabBtnText: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textSecondary },
  tabBtnTextActive: { color: COLORS.primary },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: SPACING.lg, paddingBottom: 100, gap: SPACING.md },
  statsRow: { flexDirection: 'row', gap: SPACING.md },
  statCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.lg, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  statNum: { fontSize: 36, fontWeight: '900', color: COLORS.primary },
  statLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 4 },
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  cardTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  sectionTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  recentCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  recentInfo: { flex: 1 },
  recentName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  recentSub: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  recentDate: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.white, fontWeight: '800', fontSize: FONT_SIZE.md },
  searchRow: { padding: SPACING.md, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  searchInput: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 10, fontSize: FONT_SIZE.md, color: COLORS.text },
  assessmentRow: { flexDirection: 'row', gap: SPACING.md, backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  assessmentInfo: { flex: 1 },
  assessmentName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  assessmentEmail: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  assessmentMeta: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },
  assessmentChevron: { alignSelf: 'center', fontSize: FONT_SIZE.xl, color: COLORS.textMuted },
  emptyText: { textAlign: 'center', color: COLORS.textMuted, marginTop: SPACING.xl },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  userInfo: { flex: 1 },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap' },
  userName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  youBadge: { backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: 6, paddingVertical: 2 },
  youBadgeText: { color: COLORS.white, fontSize: 9, fontWeight: '800' },
  roleBadge: { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
  roleBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  userEmail: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  roleActions: {},
  promoteBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' },
  demoteBtn: { backgroundColor: '#FEF2F2' },
  disabledBtn: { opacity: 0.4 },
  promoteBtnText: { fontSize: FONT_SIZE.md, color: COLORS.success, fontWeight: '700' },
});
