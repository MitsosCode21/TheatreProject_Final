import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function TheatreDetails() {
  const { id } = useLocalSearchParams(); 
  const [theatre, setTheatre] = useState<any>(null);
  const [shows, setShows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ΒΑΛΕ ΕΔΩ ΤΗΝ IP ΤΟΥ ΥΠΟΛΟΓΙΣΤΗ ΣΟΥ!
  const SERVER_URL = 'http://192.168.2.5:3000'; 

  useEffect(() => {
    const fetchTheatreAndShows = async () => {
      try {
        const theatresRes = await fetch(`${SERVER_URL}/theatres`);
        const theatresData = await theatresRes.json();
        const currentTheatre = theatresData.find((t: any) => t.theatre_id.toString() === id);
        setTheatre(currentTheatre);

        const showsRes = await fetch(`${SERVER_URL}/shows`);
        const showsData = await showsRes.json();
        const theatreShows = showsData.filter((s: any) => s.theatre_id.toString() === id);
        setShows(theatreShows);
      } catch (error) {
        console.error("Σφάλμα:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTheatreAndShows();
  }, [id]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#d4af37" /></View>;
  if (!theatre) return <View style={styles.center}><Text style={styles.errorText}>Το θέατρο δεν βρέθηκε.</Text></View>;

  return (
    <View style={styles.mainContainer}>
      <Stack.Screen 
        options={{ 
          title: theatre.name,
          headerStyle: { backgroundColor: '#0f172a' },
          headerTintColor: '#d4af37',
          headerBackTitle: 'Πίσω'
        }} 
      />
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        <Image 
          source={{ uri: theatre.image_url || 'https://images.unsplash.com/photo-1510590337019-5ef8d3d32116?w=800&q=80' }} 
          style={styles.coverImage} 
        />
        <View style={styles.contentContainer}>
          <Text style={styles.title}>{theatre.name}</Text>
          <Text style={styles.location}>📍 {theatre.location || 'Άγνωστη Τοποθεσία'}</Text>
          <Text style={styles.description}>{theatre.description}</Text>
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>🎭 Διαθέσιμες Παραστάσεις</Text>

          {shows.length === 0 ? (
            <Text style={styles.noShows}>Δεν υπάρχουν προγραμματισμένες παραστάσεις.</Text>
          ) : (
            shows.map((show) => (
              <View key={show.show_id} style={styles.showCard}>
                <Image 
                  source={{ uri: show.image_url || 'https://images.unsplash.com/photo-1533104816-cdd23114421b?w=400&q=80' }} 
                  style={styles.showThumbnail} 
                />
                <View style={styles.showInfo}>
                  <View>
                    <Text style={styles.showTitle}>{show.title}</Text>
                    <Text style={styles.showDesc} numberOfLines={3}>{show.description || 'Δείτε περισσότερες πληροφορίες.'}</Text>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.actionBtn}
                    onPress={() => router.push(`/show/${show.show_id}`)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionBtnText}>Εισιτήρια</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#020617' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
  errorText: { color: '#ef4444', fontSize: 18 },
  coverImage: { width: '100%', height: 250 },
  contentContainer: { backgroundColor: '#020617', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, marginTop: -25, minHeight: 500 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#f8fafc', marginBottom: 5, letterSpacing: 0.5 },
  location: { fontSize: 16, color: '#d4af37', marginBottom: 15, fontWeight: '600' },
  description: { fontSize: 15, color: '#94a3b8', lineHeight: 24, marginBottom: 20 },
  divider: { height: 1, backgroundColor: '#1e293b', marginBottom: 20 },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', color: '#f8fafc', marginBottom: 15 },
  noShows: { color: '#64748b', fontSize: 15, fontStyle: 'italic', marginTop: 10 },
  showCard: { backgroundColor: '#0f172a', padding: 12, borderRadius: 16, marginBottom: 16, flexDirection: 'row', borderWidth: 1, borderColor: '#1e293b' },
  showThumbnail: { width: 90, height: 130, borderRadius: 10, backgroundColor: '#1e293b' },
  showInfo: { flex: 1, paddingLeft: 15, justifyContent: 'space-between' },
  showTitle: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc', marginBottom: 5 },
  showDesc: { fontSize: 13, color: '#94a3b8', lineHeight: 18, marginBottom: 10 },
  actionBtn: { backgroundColor: '#d4af37', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, alignSelf: 'flex-start' },
  actionBtnText: { color: '#020617', fontWeight: 'bold', fontSize: 14 }
});