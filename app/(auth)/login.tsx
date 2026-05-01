import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { supabase } from '../../lib/supabase';
import { Colors, Radii } from '../../constants/theme';

GoogleSignin.configure({
  // Same Google Cloud project as Watchly (watchly-493808)
  // OAuth credentials: console.cloud.google.com → watchly project → Credentials
  webClientId: 'YOUR_GOOGLE_WEB_CLIENT_ID',   // same web client ID as Watchly
  iosClientId: 'YOUR_GOOGLE_IOS_CLIENT_ID',   // same iOS client ID as Watchly
});

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  // ── Email / password ──────────────────────────────────────
  async function handleEmailAuth() {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) Alert.alert('Error', error.message);
  }

  // ── Google Sign-In ────────────────────────────────────────
  async function handleGoogleSignIn() {
    try {
      setGoogleLoading(true);
      await GoogleSignin.hasPlayServices();
      const { idToken } = await GoogleSignin.signIn();
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken!,
      });
      if (error) throw error;
    } catch (e: any) {
      if (e.code !== 'SIGN_IN_CANCELLED') {
        Alert.alert('Google Sign-In Error', e.message);
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  // ── Sign in with Apple ────────────────────────────────────
  async function handleAppleSignIn() {
    try {
      setAppleLoading(true);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) throw new Error('No identity token from Apple');

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error) throw error;
    } catch (e: any) {
      // ERR_REQUEST_CANCELED = user pressed Cancel — not an error
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Apple Sign-In Error', e.message);
      }
    } finally {
      setAppleLoading(false);
    }
  }

  return (
    <LinearGradient colors={[Colors.primaryDark, Colors.primary, '#3A7D52']} style={styles.gradient}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.emoji}>🌿</Text>
            <Text style={styles.appName}>SpotRipe</Text>
            <Text style={styles.tagline}>Discover. Share. Forage Freely.</Text>
          </View>

          {/* Auth card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{isSignUp ? 'Create Account' : 'Welcome Back'}</Text>

            {/* Sign in with Apple — must appear at least as prominently as other sign-in options */}
            {Platform.OS === 'ios' && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={Radii.md}
                style={styles.appleBtn}
                onPress={handleAppleSignIn}
              />
            )}
            {appleLoading && <ActivityIndicator color={Colors.primary} style={{ marginTop: 8 }} />}

            {/* Google Sign-In */}
            <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleSignIn} disabled={googleLoading}>
              {googleLoading
                ? <ActivityIndicator color={Colors.textPrimary} />
                : <Text style={styles.googleBtnText}>🔍  Continue with Google</Text>
              }
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or sign in with email</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Email / password */}
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity style={styles.primaryBtn} onPress={handleEmailAuth} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryBtnText}>{isSignUp ? 'Sign Up' : 'Sign In'}</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={{ marginTop: 16 }}>
              <Text style={styles.toggleText}>
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Disclaimer */}
          <Text style={styles.disclaimer}>
            By continuing you agree to our Terms of Service and Privacy Policy.{'\n'}
            SpotRipe is a community resource — always forage responsibly and verify plant identification independently before consuming anything.
          </Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: 60 },
  hero: { alignItems: 'center', marginBottom: 32 },
  emoji: { fontSize: 64, marginBottom: 8 },
  appName: { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  tagline: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  cardTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 16 },
  // Apple button — full width, 44pt tall as per HIG
  appleBtn: { width: '100%', height: 50, marginBottom: 12 },
  googleBtn: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    padding: 14,
    alignItems: 'center',
    marginBottom: 4,
  },
  googleBtnText: { color: Colors.textPrimary, fontWeight: '600', fontSize: 15 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { marginHorizontal: 10, color: Colors.textMuted, fontSize: 12 },
  input: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radii.md,
    padding: 14,
    marginBottom: 12,
    color: Colors.textPrimary,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.md,
    padding: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  toggleText: { textAlign: 'center', color: Colors.primary, fontWeight: '600', fontSize: 14 },
  disclaimer: {
    marginTop: 24,
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
});
