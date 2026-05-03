import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Colors, Radii } from '../../constants/theme';

type PendingSpot = {
  id: string; title: string; plant_name: string; description: string;
  location_display: string; category_name: string; category_icon: string;
  category_color: string; submitter_name: string; access_notes: string;
  is_public_land: boolean; created_at: string;
};

export default function AdminScreen() {
  const [spots, setSpots] = useState<PendingSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'spots' | 'feedback'>('spots');

  const check = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!profile?.is_admin) { setIsAdmin(false); setLoading(false); return; }
    setIsAdmin(true);

    const { data } = await supabase
      .from('spots_with_details')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (data) setSpots(data);

    const { data: fb } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (fb) setFeedback(fb);

    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { check(); }, []));

  async function moderate(id: string, action: 'approved' | 'rejected') {
    await supabase.from('foraging_spots').update({ status: action }).eq('id', id);
    setSpots(prev => prev.filter(s => s.id !== id));
    Alert.alert(action === 'approved' ? '✅ Approved' : 'Em Rejected', 'Spot updated.');
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  if (!isAdmin) return (
    <View style={styles.center}>
      <Ionicons name="lock-closed" size={48} color={Colors.textMuted} />
      <Text style={styles.lockText}>Admin access only</Text>
    </View>
  );

  async function dismissFeedback(id: string) {
    await supabase.from('feedback').update({ status: 'reviewed' }).eq('id', id);
    setFeedback(prev => prev.filter(f => f.id !== id));
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🛑 Moderation Queue</Text>
        <Text style={styles.headerSub}>{activeTab === 'spots' ? spots.length + ' pending' : feedback.filter(f=>f.status==='new').length + ' new'}</Text>
      </View>
      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'spots' && styles.tabBtnActive]} onPress={() => setActiveTab('spots')}>
          <Text style={[styles.tabBtnText, activeTab === 'spots' && styles.tabBtnTextActive]}>Spots</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'feedback' && styles.tabBtnActive]} onPress={() => setActiveTab('feedback')}>
          <Text style={[styles.tabBtnText, activeTab === 'feedback' && styles.tabBtnTextActive]}>
            Feedback {feedback.filter(f=>f.status==='new').length > 0 ? '(' + feedback.filter(f=>f.status==='new').length + ')' : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'feedback' ? (
        feedback.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyTitle}>No feedback yet</Text></View>
        ) : (
          <FlatList
            data={feedback}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: 16, gap: 12 }}
            renderItem={({ item }) => (
              <View style={[styles.card, item.status === 'reviewed' && { opacity: 0.5 }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.catTag, { backgroundColor: '#E8F5E9' }]}>
                    <Text style={[styles.catTagText, { color: '#2D6A4F' }]}>{item.type}</Text>
                  </View>
                  <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.cardTitle}>{item.message}</Text>
                {item.status === 'new' && (
                  <TouchableOpacity style={[styles.btn, styles.approveBtn, { marginTop: 8 }]} onPress={() => dismissFeedback(item.id)}>
                    <Text style={styles.approveText}>Mark Reviewed</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          />
        )
      ) : spots.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>✅</Text>
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptySub}>No pending spots to review.</Text>
        </View>
      ) : (
        <FlatList
          data={spots}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.catTag, { backgroundColor: item.category_color + '22' }]}>
                  <Text style={[styles.catTagText, { color: item.category_color }]}>
                    {item.category_icon} {item.category_name}
                  </Text>
                </View>
                <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
              </View>

              <Text style={styles.cardTitle}>{item.title}</Text>
              {item.plant_name && <Text style={styles.plantName}>{item.plant_name}</Text>}
              {item.description && <Text style={styles.desc} numberOfLines={3}>{item.description}</Text>}

              <View style={styles.metaGrid}>
                {item.location_display && <Text style={styles.meta}>🔍 {item.location_display}</Text>}
                <Text style={styles.meta}>{item.is_public_land ? '✅ Public land' : '➠ Land unclear'}</Text>
                {item.submitter_name && <Text style={styles.meta}>👄 {item.submitter_name}</Text>}
                {item.access_notes && <Text style={styles.meta}>ℹ {item.access_notes}</Text>}
              </View>

              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[styles.btn, styles.rejectBtn]}
                  onPress={() => Alert.alert('Reject?', 'Reject this spot?', [
                    { text: 'Cancel' },
                    { text: 'Reject', style: 'destructive', onPress: () => moderate(item.id, 'rejected') },
                  ])}
                >
                  <Text style={styles.rejectText}>✕ Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.approveBtn]}
                  onPress={() => moderate(item.id, 'approved')}
                >
                  <Text style={styles.approveText}>✓ Approve</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  lockText: { fontSize: 16, color: Colors.textMuted },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: '#1A3D2B' },
  tabBtnText: { fontSize: 14, fontWeight: '600', color: '#999' },
  tabBtnTextActive: { color: '#1A3D2B' },
  header: {
    backgroundColor: Colors.surface,
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  headerSub: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  emptySub: { fontSize: 14, color: Colors.textSecondary },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  catTag: { borderRadius: Radii.full, paddingHorizontal: 10, paddingVertical: 3 },
  catTagText: { fontSize: 12, fontWeight: '700' },
  date: { fontSize: 12, color: Colors.textMuted },
  cardTitle: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, marginBottom: 2 },
  plantName: { fontSize: 13, fontStyle: 'italic', color: Colors.textSecondary, marginBottom: 6 },
  desc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginBottom: 10 },
  metaGrid: { gap: 4, marginBottom: 14 },
  meta: { fontSize: 12, color: Colors.textMuted },
  btnRow: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, padding: 12, borderRadius: Radii.md, alignItems: 'center' },
  rejectBtn: { backgroundColor: '#FEE2E2', borderWidth: 1.5, borderColor: Colors.error },
  rejectText: { color: Colors.error, fontWeight: '700' },
  approveBtn: { backgroundColor: Colors.success },
  approveText: { color: '#fff', fontWeight: '700' },
});
