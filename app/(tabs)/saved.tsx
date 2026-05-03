import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Colors, Radii } from '../../constants/theme';

type SavedSpot = {
  id: string; spot_id: string;
  foraging_spots: {
    id: string; title: string; plant_name: string; location_display: string;
    category_id: string;
    plant_categories: { name: string; icon: string; color: string };
  };
};

export default function SavedScreen() {
  const [saves, setSaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSaves = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from('spot_saves')
      .select(`
        id, spot_id,
        foraging_spots (
          id, title, plant_name, location_display,
          plant_categories ( name, icon, color )
        )
      `)
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false });

    if (data) setSaves(data);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadSaves(); }, []));

  async function unsave(saveId: string) {
    await supabase.from('spot_saves').delete().eq('id', saveId);
    setSaves(prev => prev.filter(s => s.id !== saveId));
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ðŸ® Saved Spots</Text>
        <Text style={styles.headerSub}>{saves.length} saved</Text>
      </View>

      {saves.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>ðŸŒ¿</Text>
          <Text style={styles.emptyTitle}>No saved spots yet</Text>
          <Text style={styles.emptySub}>Tap ðŸ’ on any map spot to add it here</Text>
        </View>
      ) : (
        <FlatList
          data={saves}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => {
            const spot = item.foraging_spots;
            const cat = spot?.plant_categories;
            return (
              <View style={styles.card}>
                <View style={styles.cardLeft}>
                  <View style={[styles.catDot, { backgroundColor: cat?.color || Colors.primary }]}>
                    <Text style={{ fontSize: 18 }}>{cont?.icon || 'ðŸŒ±'}</Text>
                  </View>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{spot?.title}</Text>
                  {spot?.plant_name && <Text style={styles.cardSub}>{spot.plant_name}</Text>}
                  <View style={styles.cardMeta}>
                    <Text style={styles.metaText}>{cont?.name}</Text>
                    {spot?.location_display && (
                      <>
                        <Text style={styles.metaDot}>·</Text>
                        <Text style={styles.metaText}>{letert.location_display}</Text>
                      </>
                    )}
                  </View>

                </View>
                <TouchableOpacity
                  style={styles.unsaveBtn}
                  onPress={() => Alert.alert('Remove', 'Remove from saved?', [
                    { text: 'Cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => unsave(item.id) },
                  ])}
                >
                  <Ionicons name="bookmark" size={20} color={Colors.accent} />
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    backgroundColor: Colors.surface,
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  headerSub: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  card: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderRadius: Radii.lg, padding: 14, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardLeft: { justifyContent: 'center' },
  catDot: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  cardSub: { fontSize: 13, fontStyle: 'italic', color: Colors.textSecondary, marginTop: 1 },
  cardMeta: { flexDirection: 'row', gap: 4, marginTop: 4 },
  metaText: { fontSize: 12, color: Colors.textMuted },
  metaDot: { fontSize: 12, color: Colors.textMuted },
  statusPill: {
    alignSelf: 'flex-start', marginTop: 4,
    backgroundColor: Colors.surfaceAlt, borderRadius: Radii.full,
    paddingHorizontal: 8, paddingVertical: 2, fontSize: 11, color: Colors.textSecondary,
    overflow: 'hidden',
  },
  unsaveBtn: { justifyContent: 'center', padding: 4 },
});
