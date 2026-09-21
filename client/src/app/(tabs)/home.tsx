import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Modal, Alert,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/design';
import { useAuth } from '../../context/AuthContext';
import RobotMascot from '../../components/RobotMascot';

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [introVisible, setIntroVisible] = React.useState(false);
  const [profileVisible, setProfileVisible] = React.useState(false);

  function handleStartAssessment() {
    setIntroVisible(true);
  }

  function handleBegin() {
    setIntroVisible(false);
    router.push('/assessment');
  }

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoIcon}>
            <FontAwesome5 name="chart-bar" size={16} color="#fff" />
          </View>
          <View>
            <Text style={styles.logo}>CareerTrack</Text>
            <Text style={styles.tagline}>Your Strand Finder</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.avatarBtn} onPress={() => setProfileVisible(true)}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.display_name?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Greeting */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Text style={styles.greeting}>
            Hi, {user?.display_name?.split(' ')[0] ?? 'there'} 👋
          </Text>
          <Text style={styles.greetingSubtitle}>Find your best-fit academic strand</Text>
        </Animated.View>

        {/* Hero Card */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.heroCard}>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Ready to discover{'\n'}your strand?</Text>
            <Text style={styles.heroSubtitle}>
              Answer 30 questions about grades, interests, and how you like to work.
              On-device fuzzy logic ranks all five strands.
            </Text>
            <TouchableOpacity style={styles.heroButton} onPress={handleStartAssessment} activeOpacity={0.88}>
              <Text style={styles.heroButtonText}>Start Assessment →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.heroDecor}>
            <Text style={styles.heroDecorText}>🎯</Text>
          </View>
        </Animated.View>

        {/* Stats Row */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.statsRow}>
          {[
            { icon: 'list-ol',  label: '30 Questions', sub: '~3 minutes' },
            { icon: 'brain',    label: 'Fuzzy Logic',  sub: 'On-device AI' },
            { icon: 'medal',    label: '5 Strands',    sub: 'Ranked results' },
          ].map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <FontAwesome5 name={stat.icon as any} size={24} color={COLORS.primary} solid />
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={styles.statSub}>{stat.sub}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Quick Links */}
        <Animated.View entering={FadeInDown.delay(400).springify()}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.quickGrid}>
            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => router.push('/(tabs)/history')}
              activeOpacity={0.8}
            >
              <FontAwesome5 name="clipboard-list" size={28} color={COLORS.primary} />
              <Text style={styles.quickLabel}>My History</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => router.push('/(tabs)/resources')}
              activeOpacity={0.8}
            >
              <FontAwesome5 name="link" size={28} color={COLORS.primary} />
              <Text style={styles.quickLabel}>Resources</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Strands Preview */}
        <Animated.View entering={FadeInDown.delay(500).springify()}>
          <Text style={styles.sectionTitle}>Academic Strands</Text>
          {[
            { strand: 'STEM', color: '#2E5BFF', desc: 'Science, Technology, Engineering & Math' },
            { strand: 'ABM', color: '#059669', desc: 'Accountancy, Business & Management' },
            { strand: 'HUMSS', color: '#7C3AED', desc: 'Humanities & Social Sciences' },
            { strand: 'TVL', color: '#DC2626', desc: 'Technical-Vocational-Livelihood' },
            { strand: 'GAS', color: '#D97706', desc: 'General Academic Strand' },
          ].map((s) => (
            <View key={s.strand} style={styles.strandRow}>
              <View style={[styles.strandDot, { backgroundColor: s.color }]} />
              <View>
                <Text style={styles.strandName}>{s.strand}</Text>
                <Text style={styles.strandDesc}>{s.desc}</Text>
              </View>
            </View>
          ))}
        </Animated.View>
      </ScrollView>

      {/* Assessment Intro Modal */}
      <Modal visible={introVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <RobotMascot size={64} />
            <Text style={styles.modalBubble}>
              Hi, {user?.display_name?.split(' ')[0] ?? 'there'}! I'm FIS, your career guide.
            </Text>

            <View style={styles.modalInner}>
              <Text style={styles.modalTitle}>Let's find your strand</Text>
              <Text style={styles.modalSubtitle}>
                I'll look at your grades, interests, and how you like to work — then rank the five SHS strands.
              </Text>

              <View style={styles.modalStats}>
                <View style={styles.modalStat}>
                  <Text style={styles.modalStatNum}>30</Text>
                  <Text style={styles.modalStatLabel}>questions</Text>
                </View>
                <View style={styles.modalStatDivider} />
                <View style={styles.modalStat}>
                  <Text style={styles.modalStatNum}>~3</Text>
                  <Text style={styles.modalStatLabel}>minutes</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.beginBtn} onPress={handleBegin} activeOpacity={0.85}>
              <Text style={styles.beginBtnText}>Let's Begin ›</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIntroVisible(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Maybe later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Profile Modal */}
      <Modal visible={profileVisible} transparent animationType="slide" onRequestClose={() => setProfileVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setProfileVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.profileCard}>
            {/* Handle bar */}
            <View style={styles.profileHandle} />

            {/* Avatar */}
            <View style={styles.profileAvatarWrap}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileAvatarText}>
                  {user?.display_name?.[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
            </View>

            {/* Info */}
            <Text style={styles.profileName}>{user?.display_name ?? '—'}</Text>
            <Text style={styles.profileEmail}>{user?.email ?? '—'}</Text>

            {/* Role badge */}
            <View style={[styles.roleBadge, user?.role === 'admin' && styles.roleBadgeAdmin]}>
              <Text style={[styles.roleText, user?.role === 'admin' && styles.roleTextAdmin]}>
                {user?.role === 'admin' ? '⚙ Admin' : '🎓 Student'}
              </Text>
            </View>

            <View style={styles.profileDivider} />

            {/* Logout */}
            <TouchableOpacity
              style={styles.logoutBtn}
              activeOpacity={0.85}
              onPress={async () => {
                setProfileVisible(false);
                await new Promise(r => setTimeout(r, 300));
                handleSignOut();
              }}
            >
                            <FontAwesome5 name="sign-out-alt" size={18} color="#EF4444" />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setProfileVisible(false)} style={styles.profileCancelBtn}>
              <Text style={styles.profileCancelText}>Close</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: 56,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  logoIcon: {
    width: 36, height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logo: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.primary },
  tagline: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 1 },
  avatarBtn: { padding: 4 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: COLORS.white, fontWeight: '800', fontSize: FONT_SIZE.md },
  content: { padding: SPACING.lg, paddingBottom: 100, gap: SPACING.lg },
  greeting: { fontSize: FONT_SIZE.xxl, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  greetingSubtitle: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary, marginTop: 4 },
  heroCard: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroContent: { flex: 1 },
  heroTitle: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.white, marginBottom: SPACING.sm },
  heroSubtitle: { fontSize: FONT_SIZE.sm, color: 'rgba(255,255,255,0.85)', lineHeight: 20, marginBottom: SPACING.lg },
  heroButton: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
    alignSelf: 'flex-start',
  },
  heroButtonText: { color: COLORS.primary, fontWeight: '700', fontSize: FONT_SIZE.md },
  heroDecor: { paddingLeft: SPACING.md },
  heroDecorText: { fontSize: 64 },
  statsRow: { flexDirection: 'row', gap: SPACING.sm },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  statLabel: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.text },
  statSub: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },
  sectionTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  quickGrid: { flexDirection: 'row', gap: SPACING.sm },
  quickCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickLabel: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text },
  strandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  strandDot: { width: 14, height: 14, borderRadius: 7 },
  strandName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  strandDesc: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: 40,
  },
  modalBubble: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.primary,
    fontWeight: '500',
    marginBottom: SPACING.lg,
  },
  modalInner: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  modalTitle: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  modalSubtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 20, marginBottom: SPACING.lg },
  modalStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.lg },
  modalStat: { alignItems: 'center' },
  modalStatNum: { fontSize: FONT_SIZE.xxl, fontWeight: '800', color: COLORS.primary },
  modalStatLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  modalStatDivider: { width: 1, height: 40, backgroundColor: COLORS.border },
  beginBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  beginBtnText: { color: COLORS.white, fontSize: FONT_SIZE.lg, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', paddingVertical: SPACING.sm },
  cancelBtnText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.md },

  // ── Profile modal ──────────────────────────────────────────────
  profileCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: SPACING.lg,
    paddingBottom: 40,
    paddingTop: SPACING.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 16,
  },
  profileHandle: {
    width: 40, height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  profileAvatarWrap: { marginBottom: SPACING.md },
  profileAvatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  profileAvatarText: { color: COLORS.white, fontSize: FONT_SIZE.xxxl, fontWeight: '800' },
  profileName: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  roleBadge: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    marginBottom: SPACING.lg,
  },
  roleBadgeAdmin: { backgroundColor: '#FEF3C7' },
  roleText: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.primary },
  roleTextAdmin: { color: '#D97706' },
  profileDivider: {
    width: '100%', height: 1,
    backgroundColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  logoutBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: '#FEF2F2',
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutText: { color: '#EF4444', fontSize: FONT_SIZE.md, fontWeight: '700' },
  profileCancelBtn: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.xl },
  profileCancelText: { color: COLORS.textMuted, fontSize: FONT_SIZE.md },
});
