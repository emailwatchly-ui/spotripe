import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Radii } from '../constants/theme';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    emoji: '🗺️',
    title: 'Discover Foraging Spots',
    subtitle: 'COMMUNITY-POWERED MAP',
    description: 'Browse a living map of publicly accessible fruit trees, berry bushes, nut trees, wild herbs and more — all shared by foragers like you.',
  },
  {
    emoji: '📌',
    title: 'Pin What You Find',
    subtitle: 'SHARE YOUR DISCOVERIES',
    description: 'Found a fig tree hanging over the footpath? Pin it! Help others discover free food growing in your community.',
  },
  {
    emoji: '✅',
    title: 'Verify & Update',
    subtitle: 'KEEP IT ACCURATE',
    description: 'Confirm spots are still there, report ripeness status, and leave helpful notes so everyone can plan their foraging trips.',
  },
  {
    emoji: '⚠️',
    title: 'Forage Responsibly',
    subtitle: 'SAFETY FIRST',
    description: 'Only forage on public land. Always independently verify plant identification. Take only what you need and leave plenty for wildlife and others.',
    warning: true,
  },
];

export default function OnboardingScreen() {
  const [current, setCurrent] = useState(0);
  const router = useRouter();

  async function finish() {
    await AsyncStorage.setItem('onboarding_done', 'true');
    router.replace('/(auth)/login');
  }

  const slide = SLIDES[current];
  const isLast = current === SLIDES.length - 1;

  return (
    <View style={[styles.container, slide.warning && { backgroundColor: '#FFF8E7' }]}>
      <View style={styles.content}>
        <Text style={styles.emoji}>{slide.emoji}</Text>
        <Text style={styles.subtitle}>{slide.subtitle}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.description}>{slide.description}</Text>
      </View>

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === current && styles.dotActive]} />
        ))}
      </View>

      {/* Buttons */}
      <View style={styles.btnArea}>
        {isLast ? (
          <TouchableOpacity style={styles.startBtn} onPress={finish}>
            <Text style={styles.startBtnText}>Get Started 🌿</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.navRow}>
            <TouchableOpacity style={styles.skipBtn} onPress={finish}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.nextBtn} onPress={() => setCurrent(c => c + 1)}>
              <Text style={styles.nextBtnText}>Next →</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 32, paddingTop: 100 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 80, marginBottom: 24 },
  subtitle: { fontSize: 11, fontWeight: '800', color: Colors.primary, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 },
  title: { fontSize: 30, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', marginBottom: 16, lineHeight: 36 },
  description: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 32 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  dotActive: { backgroundColor: Colors.primary, width: 24 },
  btnArea: { marginBottom: 40 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skipBtn: { padding: 14 },
  skipText: { color: Colors.textMuted, fontSize: 15 },
  nextBtn: { backgroundColor: Colors.primary, borderRadius: Radii.full, paddingHorizontal: 32, paddingVertical: 14 },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  startBtn: { backgroundColor: Colors.primaryDark, borderRadius: Radii.full, padding: 18, alignItems: 'center' },
  startBtnText: { color: '#fff', fontWeight: '800', fontSize: 18 },
});
