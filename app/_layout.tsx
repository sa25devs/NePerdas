import { useFonts } from 'expo-font';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import * as Notifications from 'expo-notifications';

import { useColorScheme } from '@/components/useColorScheme';
import { AppProvider } from '@/src/context/AppContext';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const itemId = response.notification.request.content.data?.itemId;
        if (typeof itemId === 'string') {
          router.push(`/item/${itemId}`);
        }
      },
    );
    return () => sub.remove();
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <AppProvider>
      <RootLayoutNav />
    </AppProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="review"
          options={{ title: 'Review item', presentation: 'modal' }}
        />
        <Stack.Screen name="item/[id]" options={{ title: 'Item' }} />
        <Stack.Screen
          name="manual-add"
          options={{ title: 'Add manually', presentation: 'modal' }}
        />
      </Stack>
    </ThemeProvider>
  );
}
