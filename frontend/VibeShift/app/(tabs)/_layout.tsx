import { useAuth, useUser } from '@clerk/clerk-expo';
import { Redirect, Tabs } from 'expo-router';
import React, { useEffect } from 'react';

import BottomTabBar from '@/components/BottomTabBar';
import Icon from '@/components/Icon';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useProfile } from '@/context/UserContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

function TabsInner() {
  const colorScheme = useColorScheme();
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const { user } = useUser();
  const { refreshProfile } = useProfile();

  useEffect(() => {
    if (!isSignedIn || !user) return;
    (async () => {
      try {
        const token = await getToken();
        // Sync Clerk user into our DB
        await fetch(`${API_URL}/auth/sync`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.primaryEmailAddress?.emailAddress ?? '',
            name: user.fullName ?? user.username ?? '',
          }),
        });
        // Fetch full profile into context
        await refreshProfile();
      } catch (_) {}
    })();
  }, [isSignedIn, user?.id]);

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/login" />;

  return (
    <Tabs
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Icon name="home" size={20} color={color} />, 
        }}
      />
      <Tabs.Screen
        name="demixing"
        options={{
          title: 'Demixing',
          tabBarIcon: ({ color }) => <Icon name="music-2" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="genre-transform"
        options={{
          title: 'Transform',
          tabBarIcon: ({ color }) => <Icon name="sparkles" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color }) => <Icon name="library" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Icon name="user" size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return <TabsInner />;
}
