/**
 * Onboarding Index Screen
 * Entry point for the onboarding wizard - determines where user should go
 */

import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { onboardingService } from '@/services/api/onboarding';
import { getRedirectRoute, isOnboardingComplete } from '@/utils/onboardingHelpers';
import { NAVIGATION_ROUTES } from '@/constants/onboarding';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';

export default function OnboardingIndex() {
  const { merchant, isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    checkOnboardingStatus();
  }, [isAuthenticated, authLoading, merchant]);

  const checkOnboardingStatus = async () => {
    try {
      // Wait for auth to finish loading
      if (authLoading) return;

      // If not authenticated, redirect to login
      if (!isAuthenticated || !merchant) {
        if (__DEV__) console.log('🔐 Not authenticated, redirecting to login');
        router.replace(NAVIGATION_ROUTES.LOGIN as any);
        return;
      }

      if (__DEV__) console.log('🔍 Checking onboarding status for merchant:', merchant.id);

      // Fetch current onboarding status
      const response = await onboardingService.getOnboardingStatus();

      if ((response as any).success !== false && response) {
        const status = (response as any).data || response;
        if (__DEV__) console.log('✅ Onboarding status:', status.status, 'Step:', status.currentStep);

        // Determine where to redirect based on status
        const redirectRoute = getRedirectRoute(status as any);
        if (__DEV__) console.log('🚀 Redirecting to:', redirectRoute);

        router.replace(redirectRoute as any);
      } else {
        // No status found, start from welcome
        if (__DEV__) console.log('📝 No onboarding status found, starting from welcome');
        router.replace(NAVIGATION_ROUTES.WELCOME as any);
      }
    } catch (error: any) {
      if (__DEV__) console.error('❌ Error checking onboarding status:', error);

      // If error, check if it's a 404 (no onboarding started yet)
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        if (__DEV__) console.log('📝 Starting new onboarding');
        router.replace(NAVIGATION_ROUTES.WELCOME as any);
      } else {
        // Other error - show error and allow retry
        if (__DEV__) console.error('❌ Failed to check onboarding:', error.message);
        // For now, redirect to welcome
        router.replace(NAVIGATION_ROUTES.WELCOME as any);
      }
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.light.primary} />
      <ThemedText style={styles.loadingText}>Loading your onboarding status...</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
});
