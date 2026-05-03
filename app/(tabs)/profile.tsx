import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Image, Linking, Modal, TextInput,
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
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackType, setFeedbackType] = useState('general');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const router = useRouter();

  const loadProfile = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("spots_with_details").select("id,title,status,category_name,category_icon")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
    ]);
    if (p) setProfile(p);
    if (s) setSpots(s);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadProfile(); }, []));

  async function handleSendFeedback() {
    if (!feedbackText.trim()) {
      Alert.alert('Please enter your feedback before submitting.');
      return;
    }
    setFeedbackLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('feedback').insert({
        user_id: user?.id,
        type: feedbackType,
        message: feedbackText.trim(),
        status: 'new',
      });
      if (error) throw error;
      setFeedbackVisible(false);
      setFeedbackText('');
      Alert.alert('Thank you!', 'Your feedback has been submitted and will be reviewed by our team.');
    } catch {
      Alert.alert('Error', 'Could not submit feedback. Please try again.');
    } finally {
      setFeedbackLoading(false);
    }
  }

  function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => supabase.auth.signOut() },
    ]);
  }

  function handleDeleteAccount() {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all your personal data. Your submitted foraging spots will be kept (anonymised) so the community will not be affected. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Are you absolutely sure?",
              "Your account, saved spots, comments, and all personal data will be permanently deleted.",
              [
                { text: "Go Back", style: "cancel" },
                { text: "Delete My Account", style: "destructive", onPress: performAccountDeletion },
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
      if (!session) throw new Error("No active session");

      const response = await fetch(
        "https://olvmqirywejembokfujz.supabase.co/functions/v1/delete-account",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Deletion failed");

      await supabase.auth.signOut();
      router.replace("/(auth)/login");
    } catch (err: any) {
      setDeleting(false);
      Alert.alert("Could not delete account", err.message || "Please try again or contact support.");
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
          Deleting your account...
        </Text>
      </View>
    );
  }

  const statusColor = (s: string) => ({
    approved: Colors.success, pending: Colors.warning, rejected: Colors.error, archived: Colors.textMuted,
  }[s] || Colors.textMuted);

  return (
    <>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <View style={styles.avatarWrap}>
          {profile?.avatar_url
            ? <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            : <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarEmoji}>F</Text>
              </View>
          }
        </View>
        <Text style={styles.displayName}>{profile?.display_name || "Forager"}</Text>
        {profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{profile?.total_finds || 0}</Text>
            <Text style={styles.statLabel}>Submitted</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{spots.filter(s => s.status === "approved").length}</Text>
            <Text style={styles.statLabel}>Approved</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{spots.filter(s => s.status === "pending").length}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>My Submitted Spots</Text>
      {spots.length === 0 ? (
        <View style={styles.emptySection}>
          <Text style={styles.emptyText}>You have not submitted any spots yet.</Text>
        </View>
      ) : (
        spots.map(spot => (
          <View key={spot.id} style={styles.spotRow}>
            <Text style={styles.spotEmoji}>{spot.category_icon || "?"}</Text>
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

      <Text style={styles.sectionTitle}>Account</Text>
      <View style={styles.menuCard}>
        {[
          { icon: "chatbubble-outline", label: "Send Feedback", onPress: () => setFeedbackVisible(true) },
          { icon: "information-circle-outline", label: "About ForageMate", onPress: () => Alert.alert("About ForageMate", "Version 1.0\n\nA community-powered foraging map. Discover and share wild food on public land near you.\n\nAlways verify plant identification independently before consuming anything.") },
          { icon: "shield-checkmark-outline", label: "Privacy Policy", onPress: () => Linking.openURL("https://emailwatchly-ui.github.io/spotripe/") },
          { icon: "document-text-outline", label: "Terms of Service", onPress: () => Linking.openURL("https://emailwatchly-ui.github.io/spotripe/terms.html") },
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
        ForageMate is a community tool and is not responsible for the accuracy of submissions.
      </Text>
    </ScrollView>

      <Modal visible={feedbackVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setFeedbackVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Send Feedback</Text>
            <TouchableOpacity onPress={() => setFeedbackVisible(false)}>
              <Text style={styles.modalClose}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.modalLabel}>Type</Text>
          <View style={styles.typeRow}>
            {['general', 'bug', 'feature', 'content'].map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.typeChip, feedbackType === t && styles.typeChipActive]}
                onPress={() => setFeedbackType(t)}
              >
                <Text style={[styles.typeChipText, feedbackType === t && styles.typeChipTextActive]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.modalLabel}>Message</Text>
          <TextInput
            style={styles.feedbackInput}
            placeholder="Tell us what you think..."
            placeholderTextColor="#999"
            value={feedbackText}
            onChangeText={setFeedbackText}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[styles.submitBtn, feedbackLoading && { opacity: 0.6 }]}
            onPress={handleSendFeedback}
            disabled={feedbackLoading}
          >
            <Text style={styles.submitBtnText}>{feedbackLoading ? 'Submitting...' : 'Submit Feedback'}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  heroCard: {
    backgroundColor: Colors.primaryDark, paddingTop: 60, paddingBottom: 24,
    paddingHorizontal: 20, alignItems: "center",
  },
  avatarWrap: { marginBottom: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: Colors.primaryLight },
  avatarPlaceholder: { backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  avatarEmoji: { fontSize: 36, color: "#fff", fontWeight: "800" },
  displayName: { fontSize: 22, fontWeight: "800", color: "#fff" },
  bio: { fontSize: 14, color: "rgba(255,255,255,0.7)", marginTop: 4, textAlign: "center" },
  statsRow: { flexDirection: "row", marginTop: 20 },
  statItem: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 22, fontWeight: "800", color: Colors.accentLight },
  statLabel: { fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },
  sectionTitle: {
    fontSize: 13, fontWeight: "700", color: Colors.textMuted,
    paddingHorizontal: 20, paddingTop: 24, paddingBottom: 10,
    textTransform: "uppercase", letterSpacing: 0.8,
  },
  emptySection: { paddingHorizontal: 20 },
  emptyText: { color: Colors.textMuted, fontSize: 14 },
  spotRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.surface, paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  spotEmoji: { fontSize: 22 },
  spotInfo: { flex: 1 },
  spotTitle: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  spotCat: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  statusChip: { borderWidth: 1.5, borderRadius: Radii.full, paddingHorizontal: 10, paddingVertical: 2 },
  statusText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  menuCard: { backgroundColor: Colors.surface, marginHorizontal: 16, borderRadius: Radii.lg, overflow: "hidden" },
  menuRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  menuRowBorder: { borderBottomWidth: 0 },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: "500", color: Colors.textPrimary },
  dangerZone: {
    margin: 16, marginTop: 24,
    borderWidth: 1.5, borderColor: "#FCA5A5", borderRadius: Radii.lg,
    padding: 16, backgroundColor: "#FFF5F5",
  },
  dangerTitle: { fontSize: 13, fontWeight: "800", color: Colors.error, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  dangerSub: { fontSize: 13, color: Colors.textSecondary, marginBottom: 14, lineHeight: 18 },
  deleteBtn: {
    flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: Colors.error, borderRadius: Radii.md,
    padding: 12, backgroundColor: "#FFF",
  },
  deleteBtnText: { color: Colors.error, fontWeight: "700", fontSize: 15 },
  modalContainer: { flex: 1, padding: 20, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingTop: 8 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1A3D2B' },
  modalClose: { fontSize: 16, color: '#2D6A4F', fontWeight: '600' },
  modalLabel: { fontSize: 13, fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 16 },
  typeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  typeChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: '#ddd' },
  typeChipActive: { backgroundColor: '#1A3D2B', borderColor: '#1A3D2B' },
  typeChipText: { fontSize: 13, color: '#666', fontWeight: '600' },
  typeChipTextActive: { color: '#fff' },
  feedbackInput: { borderWidth: 1.5, borderColor: '#ddd', borderRadius: 10, padding: 14, fontSize: 15, minHeight: 140, marginTop: 4, color: '#333' },
  submitBtn: { backgroundColor: '#1A3D2B', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 20 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  footer: { margin: 20, fontSize: 11, color: Colors.textMuted, lineHeight: 16, textAlign: "center" },
});
