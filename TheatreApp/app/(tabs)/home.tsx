import { router, Stack, useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function Home() {
  const [theatres, setTheatres] = useState<any[]>([]);
  const [allShows, setAllShows] = useState<any[]>([]); 
  const [searchResults, setSearchResults] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userName, setUserName] = useState<string>('');

  // ΒΑΛΕ ΕΔΩ ΤΗΝ IP ΣΟΥ!
  const SERVER_URL = 'http://192.168.2.5:3000';

  useFocusEffect(
    useCallback(() => {
      const fetchUserAndData = async () => {
        let name = null;

        if (Platform.OS === 'web') {
          name = localStorage.getItem('userName');
        } else {
          name = await SecureStore.getItemAsync('userName');
        }

        setUserName(name || 'Επισκέπτης');

        try {
          // 1. Κατεβάζουμε τα Θέατρα
          const theatresResponse = await fetch(`${SERVER_URL}/theatres`);
          const theatresData = await theatresResponse.json();
          setTheatres(theatresData);

          // 2. Κατεβάζουμε τις Παραστάσεις
          const showsResponse = await fetch(`${SERVER_URL}/shows`);
          const showsData = await showsResponse.json();
          setAllShows(showsData);

        } catch (error) {
          console.error(error);
        } finally {
          setLoading(false);
        }
      };

      fetchUserAndData();
    }, [])
  );

  // === ΤΕΛΕΙΟΠΟΙΗΜΕΝΗ ΑΝΑΖΗΤΗΣΗ (Θέατρα & Παραστάσεις μαζί!) ===
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]); 
      return;
    }
    
    const query = searchQuery.toLowerCase();
    
    // 1. Ψάχνουμε στα ΘΕΑΤΡΑ (όνομα θεάτρου ή τοποθεσία)
    const filteredTheatres = theatres.filter(theatre => {
      const matchName = theatre.name && theatre.name.toLowerCase().includes(query);
      const matchLocation = theatre.location && theatre.location.toLowerCase().includes(query);
      return matchName || matchLocation;
    });

    // 2. Ψάχνουμε στις ΠΑΡΑΣΤΑΣΕΙΣ (τίτλος, όνομα θεάτρου ή τοποθεσία)
    const filteredShows = allShows.filter(show => {
      const matchTitle = show.title && show.title.toLowerCase().includes(query);
      const matchTheatre = show.theatre_name && show.theatre_name.toLowerCase().includes(query);
      const matchLocation = show.location && show.location.toLowerCase().includes(query);
      return matchTitle || matchTheatre || matchLocation;
    });

    // 3. Ενώνουμε τα αποτελέσματα (πρώτα τα θέατρα που ταιριάζουν, μετά οι παραστάσεις)
    setSearchResults([...filteredTheatres, ...filteredShows]);
  }, [searchQuery, theatres, allShows]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#d4af37" /></View>;
  }

  // === ΕΞΥΠΝΗ ΛΟΓΙΚΗ ΕΜΦΑΝΙΣΗΣ ===
  const isSearching = searchQuery.trim().length > 0;
  const dataToDisplay = isSearching ? searchResults : theatres;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>{isSearching ? 'Αποτελέσματα' : 'Θέατρα'}</Text>
          <View style={styles.userBadge}>
            <Text style={styles.userBadgeText}>👤 {userName}</Text>
          </View>
        </View>

        {/* Μπάρα Αναζήτησης */}
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Αναζήτηση (Τίτλος, Θέατρο ή Τοποθεσία)..."
          placeholderTextColor="#64748b"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {/* Δυναμική Λίστα που ξεχωρίζει Θέατρα από Παραστάσεις */}
        <FlatList
          data={dataToDisplay}
          // Για να μην έχουμε διπλά κλειδιά, ελέγχουμε αν έχει show_id (άρα είναι παράσταση) ή theatre_id (άρα είναι θέατρο)
          keyExtractor={(item) => item.show_id ? `show-${item.show_id}` : `theatre-${item.theatre_id}`}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => {
            
            // ΑΝ ΕΙΝΑΙ ΠΑΡΑΣΤΑΣΗ (έχει show_id)
            if (item.show_id) {
              return (
                <TouchableOpacity
                  style={styles.card}
                  onPress={() => router.push(`/show/${item.show_id}`)}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardContent}>
                    <Text style={styles.title}>🎭 {item.title}</Text>
                    <Text style={styles.location}>📍 {item.theatre_name} ({item.location || 'Άγνωστη Τοποθεσία'})</Text>
                    <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
                  </View>
                </TouchableOpacity>
              );
            } 
            // ΑΝ ΕΙΝΑΙ ΘΕΑΤΡΟ (έχει theatre_id αλλά όχι show_id)
            else {
              return (
                <TouchableOpacity
                  style={styles.card}
                  onPress={() => router.push(`/theatre/${item.theatre_id}`)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: item.image_url || 'https://images.unsplash.com/photo-1510590337019-5ef8d3d32116?w=800&q=80' }}
                    style={styles.cardImage}
                  />
                  <View style={styles.cardContent}>
                    <Text style={styles.title}>{item.name}</Text>
                    <Text style={styles.location}>📍 {item.location || 'Άγνωστη Τοποθεσία'}</Text>
                    <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
                  </View>
                </TouchableOpacity>
              );
            }
          }}
          ListEmptyComponent={
            <Text style={styles.noResults}>
              {isSearching ? 'Δεν βρέθηκε τίποτα με αυτά τα κριτήρια.' : 'Δεν βρέθηκαν θέατρα.'}
            </Text>
          }
          showsVerticalScrollIndicator={false}
        />

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#020617' },
  container: { flex: 1, paddingHorizontal: 15, paddingTop: Platform.OS === 'android' ? 50 : 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#f8fafc', letterSpacing: 1 },
  userBadge: { backgroundColor: '#1e293b', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#334155' },
  userBadgeText: { color: '#d4af37', fontWeight: 'bold', fontSize: 14 },
  searchInput: { backgroundColor: '#0f172a', color: '#fff', padding: 16, borderRadius: 12, marginBottom: 20, fontSize: 16, borderWidth: 1, borderColor: '#1e293b' },
  card: { backgroundColor: '#0f172a', borderRadius: 16, marginBottom: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#1e293b' },
  cardImage: { width: '100%', height: 140 },
  cardContent: { padding: 15 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#f8fafc', marginBottom: 5 },
  location: { fontSize: 14, color: '#d4af37', marginBottom: 10, fontWeight: '600' },
  description: { fontSize: 14, color: '#94a3b8', lineHeight: 20 },
  noResults: { textAlign: 'center', marginTop: 20, fontSize: 16, color: '#64748b' }
});