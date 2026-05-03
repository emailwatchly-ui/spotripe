import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Platform, Image, KeyboardAvoidingView,
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Colors, Radii } from '../../constants/theme';

type Category = { id: string; name: string; icon: string; color: string };
type Step = 1 | 2 | 3;

const QUANTITY_OPTIONS = ['A handful', 'A bucket', 'Abundant'];
const QUALITY_OPTIONS = [1, 2, 3, 4, 5];

export default function AddSpotScreen() {
  const [step, setStep] = useState<Step>(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  // Form fields
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [plantName, setPlantName] = useState('');
  const [plantScientific, setPlantScientific] = useState('');
  const [description, setDescription] = useState('');
  const [accessNotes, setAccessNotes] = useState('');
  const [quantityEstimate, setQuantityEstimate] = useState('');
  const [qualityRating, setQualityRating] = useState(0);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locationDisplay, setLocationDisplay] = useState('');
  const [isPublicLand, setIsPublicLand] = useState(true);
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    supabase.from('plant_categories').select('id,name,icon,color').order('sort_order')
      .then(({ data }) => { if (data) setCategories(data); });
  }, []);

  async function getLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'We need location access to pin your spot.');
      return;
    }
    setLoading(true);
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    setLat(loc.coords.latitude);
    setLng(loc.coords.longitude);
    // Reverse geocode to suburb only
    const geo = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    if (geo.length > 0) {
      const g = geo[0];
      setLocationDisplay([g.subregion || g.district, g.city || g.region].filter(Boolean).join(', '));
    }
    } catch (e) {
      Alert.alert('Location Error', 'Could not get your location. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 4,
      quality: 0.7,
    });
    if (!result.canceled) {
      setPhotos(prev => [...prev, ...result.assets.map(a => a.uri)].slice(0, 4));
    }
  }

  async function handleSubmit() {
    if (!categoryId || !title || lat === null || lng === null) {
      Alert.alert('Missing info', 'Please complete all required fields.');
      return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // Upload photos to Supabase storage (simplified — upload URIs directly)
    // In production you'd upload each blob to a storage bucket
    const { error } = await supabase.from('foraging_spots').insert({
      user_id: user.id,
      category_id: categoryId,
      title,
      plant_name: plantName || null,
      plant_scientific: plantScientific || null,
      description: description || null,
      access_notes: accessNotes || null,
      quantity_estimate: quantityEstimate || null,
      quality_rating: qualityRating || null,
      lat,
      lng,
      location_display: locationDisplay || null,
      is_public_land: isPublicLand,
      status: 'pending',
    });

    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert(
        '🌿 Spot submitted!',
        'Your foraging spot has been submitted for review. It will appear on the map once approved.',
        [{ text: 'Great!', onPress: resetForm }]
      );
    }
  }

  function resetForm() {
    setStep(1);
    setCategoryId(''); setTitle(''); setPlantName(''); setPlantScientific('');
    setDescription(''); setAccessNotes(''); setQuantityEstimate('');
    setQualityRating(0); setLat(null); setLng(null);
    setLocationDisplay(''); setPhotos([]);
  }

  const selectedCategory = categories.find(c => c.id === categoryId);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Add Foraging Spot</Text>
          <View style={styles.stepIndicator}>
            {([1, 2, 3] as Step[]).map(s => (
              <View key={s} style={[styles.stepDot, s === step && styles.stepDotActive, s < step && styles.stepDotDone]} />
            ))}
          </View>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

          {/* STEP 1 — Plant details */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>🌱 What did you find?</Text>

              <Text style={styles.label}>Category *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <View style={styles.categoryGrid}>
                  {categories.map(cat => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.catChip, categoryId === cat.id && { backgroundColor: cat.color, borderColor: cat.color }]}
                      onPress={() => setCategoryId(cat.id)}
                    >
                      <Text style={styles.catChipEmoji}>{cat.icon}</Text>
                      <Text style={[styles.catChipText, categoryId === cat.id && { color: '#fff' }]}>{cat.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.label}>Spot title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Apple tree near the creek path"
                placeholderTextColor={Colors.textMuted}
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.label}>Common plant name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Crab apple, Blackberry"
                placeholderTextColor={Colors.textMuted}
                value={plantName}
                onChangeText={setPlantName}
              />

              <Text style={styles.label}>Scientific name (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Malus sylvestris"
                placeholderTextColor={Colors.textMuted}
                value={plantScientific}
                onChangeText={setPlantScientific}
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe the plant, what to look for, any ID tips…"
                placeholderTextColor={Colors.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
              />
            </View>
          )}

          {/* STEP 2 — Location & Quantity */}
          {step === 2 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>📍 Where is it?</Text>

              <TouchableOpacity style={styles.locationBtn} onPress={getLocation} disabled={loading}>
                {loading
                  ? <ActivityIndicator color={Colors.primary} />
                  : <>
                      <Ionicons name="locate" size={18} color={Colors.primary} />
                      <Text style={styles.locationBtnText}>
                        {lat ? `📍 ${locationDisplay || `${lat.toFixed(4)}, ${lng?.toFixed(4)}`}` : 'Use my current location'}
                      </Text>
                    </>
                }
              </TouchableOpacity>

              <Text style={styles.label}>Access notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="e.g. Overhangs footpath on north side of fence, visible from the walking track"
                placeholderTextColor={Colors.textMuted}
                value={accessNotes}
                onChangeText={setAccessNotes}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>Is this on public land?</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleBtn, isPublicLand && styles.toggleBtnActive]}
                  onPress={() => setIsPublicLand(true)}
                >
                  <Text style={[styles.toggleBtnText, isPublicLand && { color: '#fff' }]}>✅ Yes — public</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, !isPublicLand && styles.toggleBtnActive]}
                  onPress={() => setIsPublicLand(false)}
                >
                  <Text style={[styles.toggleBtnText, !isPublicLand && { color: '#fff' }]}>⚠️ Unsure</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Estimated quantity</Text>
              <View style={styles.chipRow}>
                {QUANTITY_OPTIONS.map(q => (
                  <TouchableOpacity
                    key={q}
                    style={[styles.chip, quantityEstimate === q && styles.chipActive]}
                    onPress={() => setQuantityEstimate(q)}
                  >
                    <Text style={[styles.chipText, quantityEstimate === q && { color: '#fff' }]}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Quality rating</Text>
              <View style={styles.chipRow}>
                {QUALITY_OPTIONS.map(q => (
                  <TouchableOpacity
                    key={q}
                    style={[styles.starBtn, qualityRating >= q && { backgroundColor: Colors.accent }]}
                    onPress={() => setQualityRating(q)}
                  >
                    <Text style={{ fontSize: 20 }}>{qualityRating >= q ? '★' : '☆'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* STEP 3 — Photos & confirm */}
          {step === 3 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>📸 Add photos (optional)</Text>
              <Text style={styles.subtitle}>Photos help others confirm identification and assess ripeness.</Text>

              <TouchableOpacity style={styles.photoPickerBtn} onPress={pickPhoto}>
                <Ionicons name="camera" size={24} color={Colors.primary} />
                <Text style={styles.photoPickerText}>Add photos (up to 4)</Text>
              </TouchableOpacity>

              {photos.length > 0 && (
                <ScrollView horizontal style={{ marginBottom: 16 }}>
                  {photos.map((uri, i) => (
                    <View key={i} style={{ marginRight: 8 }}>
                      <Image source={{ uri }} style={styles.photoThumb} />
                      <TouchableOpacity
                        style={styles.photoRemove}
                        onPress={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                      >
                        <Text style={{ color: '#fff', fontSize: 12 }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}

              {/* Summary */}
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Summary</Text>
                <Text style={styles.summaryLine}>🌿 {selectedCategory?.icon} {selectedCategory?.name}</Text>
                <Text style={styles.summaryLine}>📌 {title}</Text>
                {plantName && <Text style={styles.summaryLine}>🔎 {plantName}</Text>}
                <Text style={styles.summaryLine}>📍 {locationDisplay || (lat ? 'Location set' : '⚠️ No location')}</Text>
                <Text style={styles.summaryLine}>{isPublicLand ? '✅ Public land' : '⚠️ Land status unclear'}</Text>
              </View>

              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  ⚠️ By submitting you confirm this location is publicly accessible and you are not trespassing.
                  SpotRipe is not responsible for foraging activities — always verify plant ID independently.
                </Text>
              </View>
            </View>
          )}

        </ScrollView>

        {/* Nav buttons */}
        <View style={styles.navRow}>
          {step > 1 && (
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep((step - 1) as Step)}>
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>
          )}
          {step < 3 ? (
            <TouchableOpacity
              style={[styles.nextBtn, { opacity: (step === 1 && (!categoryId || !title)) ? 0.5 : 1 }]}
              onPress={() => setStep((step + 1) as Step)}
              disabled={step === 1 && (!categoryId || !title)}
            >
              <Text style={styles.nextBtnText}>Next →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitBtnText}>🌿 Submit Spot</Text>
              }
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.surface,
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginBottom: 12 },
  stepIndicator: { flexDirection: 'row', gap: 8 },
  stepDot: { width: 28, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  stepDotActive: { backgroundColor: Colors.primary },
  stepDotDone: { backgroundColor: Colors.primaryLight },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  stepContainer: {},
  stepTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginBottom: 16 },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.md, borderWidth: 1.5, borderColor: Colors.border,
    padding: 14, fontSize: 15, color: Colors.textPrimary,
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'nowrap', gap: 8 },
  catChip: {
    alignItems: 'center', padding: 10, borderRadius: Radii.md,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface,
    minWidth: 80,
  },
  catChipEmoji: { fontSize: 22, marginBottom: 4 },
  catChipText: { fontSize: 11, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },
  locationBtn: {
    flexDirection: 'row', gap: 8, alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radii.md,
    borderWidth: 1.5, borderColor: Colors.primary, padding: 14, marginBottom: 16,
  },
  locationBtnText: { color: Colors.primary, fontWeight: '600', fontSize: 15 },
  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  toggleBtn: {
    flex: 1, padding: 12, borderRadius: Radii.md,
    borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  toggleBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  toggleBtnText: { fontWeight: '600', fontSize: 14, color: Colors.textPrimary },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radii.full,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  starBtn: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface,
  },
  photoPickerBtn: {
    flexDirection: 'row', gap: 10, alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radii.md,
    borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed',
    padding: 16, marginBottom: 12,
  },
  photoPickerText: { color: Colors.primary, fontWeight: '600', fontSize: 15 },
  photoThumb: { width: 80, height: 80, borderRadius: Radii.sm },
  photoRemove: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: Colors.error, borderRadius: 10,
    width: 18, height: 18, alignItems: 'center', justifyContent: 'center',
  },
  summaryCard: {
    backgroundColor: Colors.surfaceAlt, borderRadius: Radii.md,
    padding: 16, marginBottom: 16, gap: 6,
  },
  summaryTitle: { fontWeight: '800', fontSize: 15, marginBottom: 4, color: Colors.textPrimary },
  summaryLine: { fontSize: 14, color: Colors.textSecondary },
  warningBox: {
    backgroundColor: '#FFF3CD', borderRadius: Radii.md,
    borderWidth: 1, borderColor: '#FBBF24', padding: 12,
  },
  warningText: { fontSize: 12, color: '#78350F', lineHeight: 18 },
  navRow: {
    flexDirection: 'row', gap: 12, padding: 16,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  backBtn: {
    flex: 1, padding: 14, borderRadius: Radii.md,
    borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center',
  },
  backBtnText: { fontWeight: '700', color: Colors.textPrimary },
  nextBtn: { flex: 2, backgroundColor: Colors.primary, borderRadius: Radii.md, padding: 14, alignItems: 'center' },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  submitBtn: { flex: 2, backgroundColor: Colors.primaryDark, borderRadius: Radii.md, padding: 14, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
