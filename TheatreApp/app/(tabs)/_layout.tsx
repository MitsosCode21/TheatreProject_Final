import { HapticTab } from '@/components/haptic-tab';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native'; // Προσθέσαμε το Platform για το ύψος

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#d4af37',
        tabBarInactiveTintColor: '#64748b',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: '#0f172a',
          borderTopWidth: 1,
          borderTopColor: '#1e293b',
          // ΑΥΞΗΣΑΜΕ ΤΙΣ ΤΙΜΕΣ ΕΔΩ:
          paddingBottom: Platform.OS === 'ios' ? 30 : 12,
          paddingTop: 12,
          height: Platform.OS === 'ios' ? 95 : 75, // Το κάναμε 10 pixels ψηλότερο συνολικά!
        },
      }}>

      {/* 1η ΘΕΣΗ (Αριστερά): Αρχική (Login) */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Αρχική',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons size={26} name={focused ? "home" : "home-outline"} color={color} />
          ),
        }}
      />

      {/* 2η ΘΕΣΗ (Στη Μέση): Παραστάσεις */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Παραστάσεις',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons size={26} name={focused ? "film" : "film-outline"} color={color} />
          ),
        }}
      />

      {/* 3η ΘΕΣΗ (Δεξιά): Το Προφίλ & Οι Κρατήσεις (Ο κώδικας του reservations!) */}
      <Tabs.Screen
        name="reservations"
        options={{
          title: 'Προφίλ', // Το λέμε Προφίλ στο μενού!
          tabBarIcon: ({ color, focused }) => (
            <Ionicons size={26} name={focused ? "person" : "person-outline"} color={color} />
          ),
        }}
      />

      {/* ΚΡΥΒΟΥΜΕ ΤΑ ΥΠΟΛΟΙΠΑ */}
      <Tabs.Screen name="explore" options={{ href: null }} />
      <Tabs.Screen name="modal" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />

    </Tabs>
  );
}