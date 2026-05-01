import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Modal, ActivityIndicator, Platform, Alert, Dimensions,
} from 'react-native';
import MapView, { Marker, Callout, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Colors, Radii } from '../../constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');

// Default to Canberra
const DEFAULT_REGION: Region = {
  latitude: -35.2809,
  longitude: 149.1300,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

type Category = { id: string; name: string; icon: string; color: string };
type Spot = {
  id: string; lat: number; lng: number; title: string; plant_name: string;
  description: string; category_name: string; category_icon: string; category_color: string;
  quality_rating: number; verified_count: number; latest_status: string;
  submitter_name: string;
  peak_season_display: string | null;
  season_notes: string | null; location_display: string; access_notes: string;
  save_count: number; comment_count: number; photo_urls: string[];
};

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Load categories
  useEffect(() => {
    supabase.from('plant_categories').select('id,name,icon,color').order('sort_order')
      .then(({ data }) => { if (data) setCategories(data); });
  }, []);

  // Load approved spots
  const loadSpots = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('spots_with_details')
      .select('*')
      .eq('status', 'approved');

    if (selectedCategories.length > 0) {
      query = query.in('category_id', selectedCategories);
    }

    const { data } = await query.limit(300);
    if (data) setSpots(data);
    setLoading(false);
  }, [selectedCategories]);

  useEffect(() => { loadSpots(); }, [loadSpots]);

  // Get user location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        mapRef.current?.animateToRegion({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.06,
          longitudeDelta: 0.06,
        }, 800);
      }
    })();
  }, []);

  function toggleCategory(catId: string) {
    setSelectedCategories(prev =>
      prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
    );
  }

  function goToMyLocation() {
    if (!userLocation) return;
    mapRef.current?.animateToRegion({
      latitude: userLocation.lat,
      longitude: userLocation.lng,
      latitudeDelta: 0.04,
      longitudeDelta: 0.04,
    }, 600);
  }

  const qualityStars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      ripe: { label: '🟢 Ripe now', color: Colors.success },
      not_yet: { label: '🟡 Not yet ripe', color: Colors.warning },
      finished: { label: '🔴 Season finished', color: Colors.error },
      damaged: { label: '⚠️ Damaged', color: Colors.warning },
      removed: { label: '⛔ Removed', color: Colors.textMuted },
    };
    return map[status] || { label: '⬜ Unknown', color: Colors.textMuted };
  };


  async function handleSaveSpot(spotId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Sign in required', 'Please sign in to save spots.');
        return;
      }
      const { error } = await supabase.from('spot_saves').insert({
        spot_id: spotId, user_id: user.id,
      });
      if (error) {
        if (error.code === '23505') {
          Alert.alert('Already saved', 'This spot is already in your saved spots.');
        } else {
          Alert.alert('Error', 'Could not save spot. Please try again.');
        }
      } else {
        Alert.alert('Saved!', 'Added to your saved spots.');
      }
    } catch (e: any) {
      Alert.alert('Error', 'Could not save spot. Please try again.');
    }
  }

  return (
    <View style={styles.container}>
      {/* Category filter strip */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {categories.map(cat => {
            const active = selectedCategories.includes(cat.id);
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.filterChip, active && { backgroundColor: cat.color }]}
                onPress={() => toggleCategory(cat.id)}
              >
                <Text style={styles.filterChipText}>{cat.icon} {cat.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Map */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={DEFAULT_REGION}
        showsUserLocation
        showsMyLocationButton={false}
        mapType="standard"
      >
        {spots.map(spot => (
          <Marker
            key={spot.id}
            coordinate={{ latitude: spot.lat, longitude: spot.lng }}
            onPress={() => setSelectedSpot(spot)}
          >
            <View style={[styles.pin, { backgroundColor: spot.category_color || Colors.primary }]}>
              <Text style={styles.pinEmoji}>{spot.category_icon || '🌿'}</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Location button */}
      <TouchableOpacity style={styles.myLocationBtn} onPress={goToMyLocation}>
        <Ionicons name="navigate" size={20} color={Colors.primary} />
      </TouchableOpacity>

      {/* Spot count badge */}
      <View style={styles.countBadge}>
        <Text style={styles.countText}>{spots.length} spot{spots.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* Spot detail sheet */}
      <Modal
        visible={!!selectedSpot}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedSpot(null)}
      >
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            {selectedSpot && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.sheetHeader}>
                  <View style={[styles.categoryTag, { backgroundColor: selectedSpot.category_color + '22' }]}>
                    <Text style={[styles.categoryTagText, { color: selectedSpot.category_color }]}>
                      {selectedSpot.category_icon} {selectedSpot.category_name}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedSpot(null)} style={styles.closeBtn}>
                    <Ionicons name="close" size={22} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.spotTitle}>{selectedSpot.title}</Text>
                {selectedSpot.plant_name && (
                  <Text style={styles.plantName}>{selectedSpot.plant_name}</Text>
                )}

                {/* Status badge */}
                {selectedSpot.latest_status && (() => {
                  const { label, color } = statusBadge(selectedSpot.latest_status);
                  return (
                    <View style={[styles.statusBadge, { borderColor: color }]}>
                      <Text style={[styles.statusText, { color }]}>{label}</Text>
                    </View>
                  );
                })()}

                {/* Stats row */}
                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{qualityStars(selectedSpot.quality_rating || 0)}</Text>
                    <Text style={styles.statLabel}>Quality</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>✓ {selectedSpot.verified_count}</Text>
                    <Text style={styles.statLabel}>Verified</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>🔖 {selectedSpot.save_count}</Text>
                    <Text style={styles.statLabel}>Saved</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>💬 {selectedSpot.comment_count}</Text>
                    <Text style={styles.statLabel}>Comments</Text>
                  </View>
                </View>

                {selectedSpot.location_display && (
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
                    <Text style={styles.infoText}>{selectedSpot.location_display}</Text>
                  </View>
                )}
                {selectedSpot.access_notes && (
                  <View style={styles.infoRow}>
                    <Ionicons name="information-circle-outline" size={16} color={Colors.textSecondary} />
                    <Text style={styles.infoText}>{selectedSpot.access_notes}</Text>
                  </View>
                )}
                {selectedSpot.peak_season_display && (
                  <View style={[styles.infoRow, styles.seasonRow]}>
                    <Ionicons name="calendar-outline" size={16} color={Colors.success} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.seasonLabel}>Peak Season</Text>
                      <Text style={styles.seasonValue}>{selectedSpot.peak_season_display}</Text>
                      {selectedSpot.season_notes && (
                        <Text style={styles.seasonNotes}>{selectedSpot.season_notes}</Text>
                      )}
                    </View>
                  </View>
                )}
                {selectedSpot.description && (
                  <Text style={styles.description}>{selectedSpot.description}</Text>
                )}

                <Text style={styles.submittedBy}>
                  Submitted by {selectedSpot.submitter_name || 'Anonymous'}
                </Text>

                {/* Action buttons */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: Colors.primary }]}
                    onPress={async () => {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) return;
                      const { error } = await supabase.from('spot_verifications').insert({
                        spot_id: selectedSpot.id, user_id: user.id,
                      });
                      if (!error) Alert.alert('Thanks!', 'Verified — helps the community!');
                    }}
                  >
                    <Text style={styles.actionBtnText}>✓ Verify</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: Colors.accent }]}
                    onPress={() => handleSaveSpot(selectedSpot.id)}
                  >
                    <Text style={styles.actionBtnText}>🔖 Save</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  filterBar: {
    position: 'absolute', top: 56, left: 0, right: 0, zIndex: 10,
    paddingVertical: 8,
  },
  filterScroll: { paddingHorizontal: 12, gap: 8 },
  filterChip: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  filterChipText: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  pin: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  pinEmoji: { fontSize: 18 },
  myLocationBtn: {
    position: 'absolute', bottom: 120, right: 16, zIndex: 10,
    backgroundColor: Colors.surface, borderRadius: 24, padding: 12,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
  },
  countBadge: {
    position: 'absolute', top: 112, right: 16, zIndex: 10,
    backgroundColor: Colors.primaryDark, borderRadius: Radii.full,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  countText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '75%',
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  categoryTag: { borderRadius: Radii.full, paddingHorizontal: 12, paddingVertical: 4 },
  categoryTagText: { fontSize: 12, fontWeight: '700' },
  closeBtn: { padding: 4 },
  spotTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginBottom: 2 },
  plantName: { fontSize: 14, fontStyle: 'italic', color: Colors.textSecondary, marginBottom: 12 },
  statusBadge: {
    alignSelf: 'flex-start', borderWidth: 1.5, borderRadius: Radii.full,
    paddingHorizontal: 12, paddingVertical: 4, marginBottom: 12,
  },
  statusText: { fontSize: 13, fontWeight: '600' },
  statsRow: { flexDirection: 'row', marginBottom: 16, gap: 12 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  statLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  infoRow: { flexDirection: 'row', gap: 6, marginBottom: 8, alignItems: 'flex-start' },
  infoText: { fontSize: 14, color: Colors.textSecondary, flex: 1 },
  description: { fontSize: 14, color: Colors.textPrimary, lineHeight: 20, marginTop: 8, marginBottom: 12 },
  submittedBy: { fontSize: 12, color: Colors.textMuted, marginBottom: 16 },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  actionBtn: { flex: 1, padding: 14, borderRadius: Radii.md, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
