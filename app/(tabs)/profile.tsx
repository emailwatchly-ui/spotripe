import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Image,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Colors, Radii } from '../../constants/theme';

type Profile = {
  id: string; display_name: string; avatar_url: string;
  bio: string; total_finds: number; created_at: string;
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [spots, setSpots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const loadProfile = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('spots_with_details').select('id,title,status,category_name,category_icon')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
    ]);
    if (p) setProfile(p);
    if (s) setSpots(s);
    setLoading(false);
  }, []);

  useFocusEffect(loadProfile);

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  }

  // Apple requires in-app account deletion with immediate effect (Guideline 5.1.1(v))
  function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your personal data. Your submitted foraging spots will be kept (anonymised) so the community isn\'t affected.\n\nThis cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            // Second confirmation — Apple reviewers specifically look for this
            Alert.alert(
              'Are you absolutely sure?',
              'Your account, saved spots, comments, and all personal data will be permanently deleted.',
              [
                { text: 'Go Back', style: 'cancel' },
                {
                  text: 'Delete My Account',
                  style: 'destructive',
                  onPress: performAccountDeletion,
                },
              ]
            );
          },
        },
      ]
    );
  }

  async function performAccountDeletion() {
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const response = await fetch(
        'https://olvmqirywejembokfujz.supabase.co/functions/v1/delete-account',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Deletion failed');

      // Sign out locally after server deletion
      await supabase.auth.signOut();
      router.replace('/(auth)/login');
    } catch (err: any) {
      setDeleting(false);
      Alert.alert('Could not delete account', err.message || 'Please try again or contact support.');
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  if (deleting) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.error} />
        <Text style={[styles.displayName, { marginTop: 16, color: Colors.textSecondary }]}>
          Deleting your account…
        </Text>
      </View>
    );
  }

  const statusColor = (s: string) => ({
    approved: Colors.success, pending: Colors.warning, rejected: Colors.error, archived: Colors.textMuted,
  }[s] || Colors.textMuted);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.heroCard}>
        <View style={styles.avatarWrap}>
          {profile?.avatar_url
            ? <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            : <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarEmoji}>🌿</Text>
              </View>
          }
        </View>
        <Text style={styles.displayName}>{profile?.display_name || 'Forager'}</Text>
        {profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{profile?.total_finds || 0}</Text>
            <Text style={styles.statLabel}>Submitted</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{spots.filter(s => s.status === 'approved').length}</Text>
            <Text style={styles.statLabel}>Approved</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{spots.filter(s => s.status === 'pending').length}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>
      </View>

      {/* Submitted spots */}
      <Text style={styles.sectionTitle}>My Submitted Spots</Text>
      {spots.length === 0 ? (
        <View style={styles.emptySection}>
          <Text style={styles.emptyText}>You haven't submitted any spots yet.</Text>
        </View>
      ) : (
        spots.map(spot => (
          <View key={spot.id} style={styles.spotRow}>
            <Text style={styles.spotEmoji}>{spot.category_icon || '🌱'}</Text>
            <View style={styles.spotInfo}>
              <Text style={styles.spotTitle}>{spot.title}</Text>
              <Text style={styles.spotCat}>{spot.category_name}</Text>
            </View>
            <View style={[styles.statusChip, { borderColor: statusColor(spot.status) }]}>
              <Text style={[styles.statusText, { color: statusColor(spot.status) }]}>{spot.status}</Text>
            </View>
          </View>
        ))
      )}

      {/* Account settings */}
      <Text style={styles.sectionTitle}>Account</Text>
      <View style={styles.menuCard}>
        {[
          { icon: 'chatbubble-outline', label: 'Send Feedback', onPress: () => {} },
          { icon: 'information-circle-outline', label: 'About SpotRipe', onPress: () => {} },
          { icon: 'shield-checkmark-outline', label: 'Privacy Policy', onPress: () => {} },
          { icon: 'document-text-outline', label: 'Terms of Service', onPress: () => {} },
        ].map(item => (
          <TouchableOpacity key={item.label} style={styles.menuRow} onPress={item.onPress}>
            <Ionicons name={item.icon as any} size={20} color={Colors.textSecondary} />
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={[styles.menuRow, styles.menuRowBorder]} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={[styles.menuLabel, { color: Colors.error }]}>Sign Out</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.error} />
        </TouchableOpacity>
      </View>

      {/* Delete Account — Apple Guideline 5.1.1(v) requires this to be accessible */}
      <View style={styles.dangerZone}>
        <Text style={styles.dangerTitle}>Danger Zone</Text>
        <Text style={styles.dangerSub}>
          Permanently delete your account and all associated personal data.
        </Text>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
          <Ionicons name="trash-outline" size={18} color={Colors.error} />
          <Text style={styles.deleteBtnText}>Delete Account</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>
        Always forage responsibly. Verify plant identification from multiple reliable sources before consuming anything.
        SpotRipe is a community tool and is not responsible for the accuracy of submissions.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  heroCard: {
    backgroundColor: Colors.primaryDark, paddingTop: 60, paddingBottom: 24,
    paddingHorizontal: 20, alignItems: 'center',
  },
  avatarWrap: { marginBottom: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: Colors.primaryLight },
  avatarPlaceholder: { backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 36 },
  displayName: { fontSize: 22, fontWeight: '800', color: '#fff' },
  bio: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4, textAlign: 'center' },
  statsRow: { flexDirection: 'row', marginTop: 20 },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800', color: Colors.accentLight },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: Colors.textMuted,
    paddingHorizontal: 20, paddingTop: 24, paddingBottom: 10,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  emptySection: { paddingHorizontal: 20 },
  emptyText: { color: Colors.textMuted, fontSize: 14 },
  spotRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  spotEmoji: { fontSize: 22 },
  spotInfo: { flex: 1 },
  spotTitle: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  spotCat: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  statusChip: { borderWidth: 1.5, borderRadius: Radii.full, paddingHorizontal: 10, paddingVertical: 2 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  menuCard: { backgroundColor: Colors.surface, marginHorizontal: 16, borderRadius: Radii.lg, overflow: 'hidden' },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  menuRowBorder: { borderBottomWidth: 0 },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  // Danger zone — clearly separated from normal menu items
  dangerZone: {
    margin: 16, marginTop: 24,
    borderWidth: 1.5, borderColor: '#FCA5A5', borderRadius: Radii.lg,
    padding: 16, backgroundColor: '#FFF5F5',
  },
  dangerTitle: { fontSize: 13, fontWeight: '800', color: Colors.error, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  dangerSub: { fontSize: 13, color: Colors.textSecondary, marginBottom: 14, lineHeight: 18 },
  deleteBtn: {
    flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.error, borderRadius: Radii.md,
    padding: 12, backgroundColor: '#FFF',
  },
  deleteBtnText: { color: Colors.error, fontWeight: '700', fontSize: 15 },
  footer: { margin: 20, fontSize: 11, color: Colors.textMuted, lineHeight: 16, textAlign: 'center' },
});
