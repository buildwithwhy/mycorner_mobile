import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, SHADOWS } from '../constants/theme';
import { Button, Heading, Subheading, Body, Caption } from '../components';
import logger from '../utils/logger';

export default function LoginScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { signIn, signInWithGoogle, session } = useAuth();

  // When session becomes valid, navigate back (user logged in successfully)
  // Only do this if we're on the Login screen in the stack (not rendered inline by Profile tab)
  useEffect(() => {
    if (session && route.name === 'Login') {
      // If we can go back, go back to where user came from
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        // Otherwise go to main screen
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' as never }],
        });
      }
    }
  }, [session, navigation, route.name]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Information', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      Alert.alert('Login Failed', error.message);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    setLoading(false);

    if (error) {
      // More descriptive error messages
      const errorMessage = (error as Error).message || 'An error occurred';
      if (errorMessage.includes('cancelled')) {
        // Don't show alert for user-initiated cancellation
        return;
      }
      Alert.alert('Google Login Failed', errorMessage);
    }
    // Successfully signed in - navigation will happen automatically via AuthContext
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Heading style={styles.logo} color={COLORS.primary}>MyCorner</Heading>
          <Body align="center" color={COLORS.gray500}>Find your perfect London neighborhood</Body>
        </View>

        <View style={styles.form}>
          <Subheading style={styles.title}>Welcome Back</Subheading>
          <Body color={COLORS.gray500} style={styles.subtitle}>Sign in to continue</Body>

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={COLORS.gray400} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={COLORS.gray400}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.gray400} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={COLORS.gray400}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color={COLORS.gray400}
              />
            </TouchableOpacity>
          </View>

          <Button
            title="Sign In"
            onPress={handleEmailLogin}
            loading={loading}
            fullWidth
            size="large"
            style={styles.loginButton}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Caption style={styles.dividerText}>OR</Caption>
            <View style={styles.dividerLine} />
          </View>

          <Button
            title="Continue with Google"
            onPress={handleGoogleLogin}
            variant="outline"
            icon="logo-google"
            disabled={loading}
            fullWidth
            size="large"
            style={styles.googleButton}
            textStyle={styles.googleButtonText}
          />

          <View style={styles.footer}>
            <Body color={COLORS.gray500}>Don't have an account? </Body>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp' as never)}>
              <Body color={COLORS.primary} style={styles.footerLink}>Sign Up</Body>
            </TouchableOpacity>
          </View>

          <Button
            title="Skip for now"
            onPress={() => navigation.navigate('Main' as never)}
            variant="ghost"
            style={styles.skipButton}
            textStyle={styles.skipButtonText}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray50,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xxxl,
  },
  logo: {
    fontSize: 48,
    marginBottom: SPACING.sm,
  },
  form: {
    backgroundColor: COLORS.warmWhite,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xxl,
    ...SHADOWS.medium,
  },
  title: {
    marginBottom: SPACING.xs,
  },
  subtitle: {
    marginBottom: SPACING.xxl,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZES.base,
    color: COLORS.gray900,
  },
  eyeIcon: {
    padding: SPACING.sm,
  },
  loginButton: {
    marginBottom: SPACING.lg,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.gray200,
  },
  dividerText: {
    marginHorizontal: SPACING.md,
  },
  googleButton: {
    borderColor: COLORS.gray300,
  },
  googleButtonText: {
    color: COLORS.gray900,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.xl,
  },
  footerLink: {
    fontWeight: '600',
  },
  skipButton: {
    marginTop: SPACING.lg,
  },
  skipButtonText: {
    color: COLORS.gray400,
  },
});
