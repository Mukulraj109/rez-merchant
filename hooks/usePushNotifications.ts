import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuth } from '@/contexts/AuthContext';
import { notificationsService } from '@/services/api/notifications';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  } as Notifications.NotificationBehavior),
});

export function usePushNotifications() {
  const { state } = useAuth();
  const tokenRef = useRef<string | null>(null);
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!state.isAuthenticated || registeredRef.current) return;

    async function registerForPushNotifications() {
      try {
        // Check existing permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          console.log('[Push] Permission not granted');
          return;
        }

        // Get Expo push token
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: undefined, // Uses app.json/app.config.js projectId
        });
        const pushToken = tokenData.data;
        tokenRef.current = pushToken;

        // Determine platform
        const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

        // Register with backend
        await notificationsService.registerPushToken(pushToken, platform);
        registeredRef.current = true;
        console.log('[Push] Token registered successfully:', pushToken.substring(0, 20) + '...');

        // Set up Android notification channel
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('merchant-alerts', {
            name: 'Merchant Alerts',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#7C3AED',
            sound: 'default',
          });
        }
      } catch (error) {
        console.error('[Push] Registration failed:', error);
      }
    }

    registerForPushNotifications();

    // Cleanup: unregister token on logout
    return () => {
      if (tokenRef.current && !state.isAuthenticated) {
        notificationsService.unregisterPushToken(tokenRef.current).catch(() => {});
        registeredRef.current = false;
      }
    };
  }, [state.isAuthenticated]);

  return { pushToken: tokenRef.current };
}
