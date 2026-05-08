import { Tabs } from 'expo-router';
import React from 'react';

import BottomTabBar from '@/components/BottomTabBar';
import Icon from '@/components/Icon';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

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
