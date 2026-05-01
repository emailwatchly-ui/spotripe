import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator, Linking, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '../../lib/supabase';
import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: '128071343253-8ibt959omp4n15sugom9ru67j1ur0rql.apps.googleusercontent.com',
  iosClientId: '128071343253-3ou40vpr84533eq435pl5rdahumb6rer.apps.googleusercontent.com',
  scopes: ['email', 'profile'],
});
import { Colors, Radii } from '../../constants/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

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

  async function handleGoogleSignIn() {
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (response.type === 'success') {
        const { idToken } = response.data;
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: idToken,
        });
        if (error) throw error;
      }
    } catch (e: any) {
      if (isErrorWithCode(e)) {
        if (e.code !== statusCodes.SIGN_IN_CANCELLED) {
          Alert.alert('Google Sign-In Error', e.message);
        }
      } else {
        Alert.alert('Google Sign-In Error', e.message);
      }
    }
  }

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
          <View style={styles.hero}>
            <Image source={require('../../assets/icon.png')} style={styles.logo} />
            <Text style={styles.appName}>ForageMate</Text>
            <Text style={styles.tagline}>Discover. Share. Forage Freely.</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{isSignUp ? 'Create Account' : 'Welcome Back'}</Text>
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
            <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleSignIn}>
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </TouchableOpacity>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or sign in with email</Text>
              <View style={styles.dividerLine} />
            </View>
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
          <Text style={styles.disclaimer}>
            {'By continuing you agree to our '}
            <Text style={styles.disclaimerLink} onPress={() => Linking.openURL('https://emailwatchly-ui.github.io/spotripe/terms.html')}>Terms of Service</Text>
            {' and '}
            <Text style={styles.disclaimerLink} onPress={() => Linking.openURL('https://emailwatchly-ui.github.io/spotripe/')}>Privacy Policy</Text>
            {'.'}
            {'\nForageMate is a community resource - always forage responsibly and verify plant identification independently before consuming anything.'}
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
  logo: { width: 90, height: 90, borderRadius: 20, marginBottom: 12 },
  appName: { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  tagline: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  card: { backgroundColor: Colors.surface, borderRadius: Radii.xl, padding: 24, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 16 },
  appleBtn: { width: '100%', height: 50, marginBottom: 12 },
  googleBtn: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, padding: 14, alignItems: 'center', marginBottom: 4 },
  googleBtnText: { color: Colors.textPrimary, fontWeight: '600', fontSize: 15 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { marginHorizontal: 10, color: Colors.textMuted, fontSize: 12 },
  input: { backgroundColor: Colors.surfaceAlt, borderRadius: Radii.md, padding: 14, marginBottom: 12, color: Colors.textPrimary, fontSize: 15, borderWidth: 1, borderColor: Colors.border },
  primaryBtn: { backgroundColor: Colors.primary, borderRadius: Radii.md, padding: 15, alignItems: 'center', marginTop: 4 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  toggleText: { textAlign: 'center', color: Colors.primary, fontWeight: '600', fontSize: 14 },
  disclaimer: { marginTop: 24, color: 'rgba(255,255,255,0.55)', fontSize: 11, textAlign: 'center', lineHeight: 16 },
  disclaimerLink: { color: 'rgba(255,255,255,0.85)', textDecorationLine: 'underline' },
});
