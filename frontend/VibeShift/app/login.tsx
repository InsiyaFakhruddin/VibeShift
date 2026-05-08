import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import GradientText from '@/components/GradientText';
import Icon from '@/components/Icon';
import { ThemedText } from '@/components/themed-text';
import { Theme } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function Login() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const scale = React.useRef(new Animated.Value(1)).current;
  const floatAnim = React.useRef(new Animated.Value(0)).current;

  const background = useThemeColor({}, 'background');

  React.useEffect(() => {
    const floatingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    );
    floatingAnimation.start();
    return () => floatingAnimation.stop();
  }, [floatAnim]);

  function handleSubmit() {
    // Fixed authentication - only allow specific credentials
    const validEmail = 'insiya@gmail.com';
    const validPassword = '1234';

    if (isLogin) {
      // Login mode - check credentials
      if (email === validEmail && password === validPassword) {
        router.replace('/(tabs)');
      } else {
        alert('Invalid email or password. Please try again.');
      }
    } else {
      // Sign up mode - deny all attempts
      alert('Sign up is not available. Please use the fixed login credentials:\nEmail: insiya@gmail.com\nPassword: 1234');
    }
  }

  function animateScale(toValue: number) {
    Animated.spring(scale, { toValue, useNativeDriver: false, friction: 8 }).start();
  }

  return (
    <ScrollView style={[styles.scrollContainer, { backgroundColor: Theme.background }]} contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        {/* Brand Section with Music Icon */}
        <View style={styles.brand}>
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={[Theme.secondary, Theme.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <Icon name="disc-3" size={32} color="white" />
            </LinearGradient>
          </View>
          <View style={{ position: 'relative', alignItems: 'center' }}>
            <GradientText 
              text="VibeShift"
              colors={['#ec4981', '#22c55e']}
              fontSize={32}
              width={200}
              height={45}
              align="center"
              style={styles.title}
            />
            <Animated.View 
              style={[
                styles.musicNote1,
                {
                  transform: [
                    {
                      translateY: floatAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -20],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                <Path d="M9 18V5l12-2v13" stroke={Theme.secondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <Circle cx="6" cy="18" r="3" stroke={Theme.secondary} strokeWidth="2" />
                <Circle cx="18" cy="16" r="3" stroke={Theme.secondary} strokeWidth="2" />
              </Svg>
            </Animated.View>
          </View>
          <ThemedText style={styles.subtitle}>
            <Text>Transform Your Sound</Text>
          </ThemedText>
        </View>

        {/* Card with Border */}
        <Pressable
          onPress={() => {}}
          onHoverIn={() => Platform.OS === 'web' && animateScale(0.99)}
          onHoverOut={() => Platform.OS === 'web' && animateScale(1)}
          onPressIn={() => animateScale(0.98)}
          onPressOut={() => animateScale(1)}
          style={styles.cardPressable}
        >
          <Animated.View style={[styles.cardAnimated, { transform: [{ scale }] }]}>
            <View style={styles.cardContainer}>
              {/* Tab Buttons */}
              <View style={styles.tabsRow}>
                <Pressable 
                  onPress={() => setIsLogin(true)} 
                  style={[styles.tab, isLogin && styles.tabActive]}
                >
                  <ThemedText style={[styles.tabText, isLogin && styles.tabTextActive]}>
                    <Text>Login</Text>
                  </ThemedText>
                </Pressable>
                <Pressable 
                  onPress={() => setIsLogin(false)} 
                  style={[styles.tab, !isLogin && styles.tabActive]}
                >
                  <ThemedText style={[styles.tabText, !isLogin && styles.tabTextActive]}>
                    <Text>Sign Up</Text>
                  </ThemedText>
                </Pressable>
              </View>

              {/* Input Fields */}
              {!isLogin && (
                <View style={styles.inputWrapper}>
                  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={styles.inputIcon}>
                    <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={Theme.mutedForeground} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <Circle cx="12" cy="7" r="4" stroke={Theme.mutedForeground} strokeWidth="2" />
                  </Svg>
                  <TextInput
                    placeholder="Username"
                    placeholderTextColor={Theme.mutedForeground}
                    value={username}
                    onChangeText={setUsername}
                    style={styles.input}
                  />
                </View>
              )}

              <View style={styles.inputWrapper}>
                <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={styles.inputIcon}>
                  <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke={Theme.mutedForeground} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M22 6l-10 7L2 6" stroke={Theme.mutedForeground} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
                <TextInput
                  placeholder="Email"
                  placeholderTextColor={Theme.mutedForeground}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={styles.inputIcon}>
                  <Path d="M19 11H5c-1.1 0-2 .9-2 2v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7c0-1.1-.9-2-2-2zm-7 3v2" stroke={Theme.mutedForeground} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M7 11V7c0-2.76 2.24-5 5-5s5 2.24 5 5v4" stroke={Theme.mutedForeground} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
                <TextInput
                  placeholder="Password"
                  placeholderTextColor={Theme.mutedForeground}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  style={styles.input}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={Theme.mutedForeground} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <Circle cx="12" cy="12" r="3" stroke={Theme.mutedForeground} strokeWidth="2" />
                  </Svg>
                </Pressable>
              </View>

              {/* Forgot Password */}
              <Pressable style={styles.forgotPasswordContainer}>
                <ThemedText style={styles.forgotPassword}>
                  <Text>Forgot password?</Text>
                </ThemedText>
              </Pressable>

              {/* Main Login Button with Gradient */}
              <Pressable onPress={handleSubmit} style={styles.submitButtonWrapper}>
                <LinearGradient
                  colors={[Theme.secondary, Theme.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitButton}
                >
                  <ThemedText style={styles.submitText}>
                    <Text>{isLogin ? 'Login' : 'Create Account'}</Text>
                  </ThemedText>
                </LinearGradient>
              </Pressable>

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <ThemedText style={styles.dividerText}>
                  <Text>or continue with</Text>
                </ThemedText>
                <View style={styles.divider} />
              </View>

              {/* Social Buttons */}
              <View style={styles.socialContainer}>
                <Pressable style={styles.socialButton}>
                  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="white" />
                    <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="white" />
                    <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="white" />
                    <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="white" />
                  </Svg>
                  <ThemedText style={styles.socialButtonText}>
                    <Text>Google</Text>
                  </ThemedText>
                </Pressable>

                <Pressable style={styles.socialButton}>
                  <Svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <Path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </Svg>
                  <ThemedText style={styles.socialButtonText}>
                    <Text>GitHub</Text>
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </Pressable>

        {/* Footer */}
        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>
            <Text>By continuing, you agree to our </Text>
            <ThemedText style={styles.footerLink}>
              <Text>Terms of Service</Text>
            </ThemedText>
            <Text> and </Text>
            <ThemedText style={styles.footerLink}>
              <Text>Privacy Policy</Text>
            </ThemedText>
          </ThemedText>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100%',
  },
  brand: {
    alignItems: 'center',
    marginBottom: 40,
    position: 'relative',
    paddingTop: 20,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    shadowColor: Theme.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '400',
  },
  musicNote1: {
    position: 'absolute',
    top: -15,
    right: -40,
    opacity: 0.6,
  },
  cardPressable: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 24,
    borderRadius: 20,
  },
  cardAnimated: {
    width: '100%',
    borderRadius: 20,
    shadowColor: Theme.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  cardContainer: {
    width: '100%',
    paddingVertical: 24,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: Theme.card,
    borderWidth: 2,
    borderColor: Theme.secondary,
    overflow: 'hidden',
    gap: 16,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 6,
    borderRadius: 12,
    marginBottom: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  tabTextActive: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.secondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    height: 48,
    position: 'relative',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 48,
    color: '#fff',
    fontSize: 14,
  },
  eyeIcon: {
    padding: 8,
    marginRight: -8,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    paddingTop: 4,
  },
  forgotPassword: {
    fontSize: 12,
    color: Theme.primary,
    fontWeight: '500',
  },
  submitButtonWrapper: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: Theme.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  submitButton: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    gap: 12,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  dividerText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: '500',
  },
  socialContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Theme.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  socialButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 12,
  },
  footerText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 16,
  },
  footerLink: {
    color: Theme.primary,
    fontWeight: '600',
  },
});
