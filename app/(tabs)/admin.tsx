import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Alert, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Colors, Radii } from '../../constants/theme';

type Spot = {
  id: string; title: string; plant_name: string; description: string;
  location_display: string; status: string;
  category_name: string; category_icon: string; submitter_name: string;
  lat: number; lng: number; created_at: string;
};

type Feedback = {
  id: string; type: string; message: string; status: string; created_at: string;
};

export default function AdminScreen() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'spots' | 'feedback'>('spots');

  const checkAdmin = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: profile } = await supabase
      .from('profiles').select('is_admin').eq('id', user.id).single();
    if (!profile?.is_admin) { setLoading(false); return; }
    setIsAdmin(true);

    const { data } = await supabase
      .from('spots_with_details')
      .select('id,title,plant_name,description,location_display,status,category_name,category_icon,submitter_name,lat,lng,created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    if (data) setSpots(data);

    const { data: fb } = await supabase
      .from('feedback').select('*').order('created_at', { ascending: false }).limit(50);
    if (fb) setFeedback(fb);

    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { checkAdmin(); }, []));

  async function handleApprove(id: string) {
    const { error } = await supabase.from('foraging_spots').update({ status: 'approved' }).eq('id', id);
    if (!error) setSpots(prev => prev.filter(s => s.id !== id));
    else Alert.alert('Error', 'Could not approve spot.');
  }

  async function handleReject(id: string) {
    Alert.alert('Reject Spot', 'Are you sure you want to reject this spot?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('foraging_spots').update({ status: 'rejected' }).eq('id', id);
          if (!error) setSpots(prev => prev.filter(s => s.id !== id));
          else Alert.alert('Error', 'Could not reject spot.');
        },
      },
    ]);
  }

  async function dismissFeedback(id: string) {
    await supabase.from('feedback').update({ status: 'reviewed' }).eq('id', id);
    setFeedback(prev => prev.map(f => f.id === id ? { ...f, status: 'reviewed' } : f));
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <Ionicons name="lock-closed-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>Admin Access Required</Text>
        <Text style={styles.emptyText}>You do not have permission to view this page.</Text>
      </View>
    );
  }

  const newFeedbackCount = feedback.filter(f => f.status === 'new').length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin</Text>
        <Text style={styles.headerSub}>
          {activeTab === 'spots' ? spots.length + ' pending' : newFeedbackCount + ' new feedback'}
        </Text>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'spots' && styles.tabBtnActive]}
          onPress={() => setActiveTab('spots')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'spots' && styles.tabBtnTextActive]}>
            Spots {spots.length > 0 ? '(' + spots.length + ')' : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'feedback' && styles.tabBtnActive]}
          onPress={() => setActiveTab('feedback')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'feedback' && styles.tabBtnTextActive]}>
            Feedback {newFeedbackCount > 0 ? '(' + newFeedbackCount + ')' : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'spots' ? (
        spots.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle-outline" size={48} color={Colors.success} />
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptyText}>No spots waiting for review.</Text>
          </View>
        ) : (
          <FlatList
            data={spots}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: 16, gap: 12 }}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.catTag}>
                    <Text style={styles.catTagText}>{item.category_icon} {item.category_name}</Text>
                  </View>
                  <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardPlant}>{item.plant_name}</Text>
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
                  <Text style={styles.locationText}>{item.location_display}</Text>
                </View>
                {item.description && (
                  <Text style={styles.cardDesc} numberOfLines={3}>{item.description}</Text>
                )}
                <Text style={styles.submittedBy}>Submitted by {item.submitter_name || 'Unknown'}</Text>
                <View style={styles.btnRow}>
                  <TouchableOpacity style={[styles.btn, styles.rejectBtn]} onPress={() => handleReject(item.id)}>
                    <Text style={styles.rejectText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btn, styles.approveBtn]} onPress={() => handleApprove(item.id)}>
                    <Text style={styles.approveText}>Approve</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )
      ) : (
        feedback.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="chatbubble-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No feedback yet</Text>
            <Text style={styles.emptyText}>User feedback will appear here.</Text>
          </View>
        ) : (
          <FlatList
            data={feedback}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: 16, gap: 12 }}
            renderItem={({ item }) => (
              <View style={[styles.card, item.status === 'reviewed' && { opacity: 0.5 }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.catTag, { backgroundColor: '#E8F5E9' }]}>
                    <Text style={[styles.catTagText, { color: Colors.primary }]}>{item.type}</Text>
                  </View>
                  <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.cardDesc}>{item.message}</Text>
                {item.status === 'new' && (
                  <TouchableOpacity
                    style={[styles.btn, styles.approveBtn, { marginTop: 8 }]}
                    onPress={() => dismissFeedback(item.id)}
                  >
                    <Text style={styles.approveText}>Mark Reviewed</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  header: { backgroundColor: Colors.primaryDark, paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: Colors.border },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  tabBtnTextActive: { color: Colors.primary },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
  card: { backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  catTag: { backgroundColor: Colors.primaryLight + '30', borderRadius: Radii.full, paddingHorizontal: 10, paddingVertical: 3 },
  catTagText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  date: { fontSize: 11, color: Colors.textMuted },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
  cardPlant: { fontSize: 13, color: Colors.textSecondary, fontStyle: 'italic', marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  locationText: { fontSize: 12, color: Colors.textMuted, flex: 1 },
  cardDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginBottom: 8 },
  submittedBy: { fontSize: 11, color: Colors.textMuted, marginBottom: 12 },
  btnRow: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: Radii.md, alignItems: 'center' },
  rejectBtn: { borderWidth: 1.5, borderColor: Colors.error },
  rejectText: { color: Colors.error, fontWeight: '700', fontSize: 14 },
  approveBtn: { backgroundColor: Colors.success },
  approveText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
