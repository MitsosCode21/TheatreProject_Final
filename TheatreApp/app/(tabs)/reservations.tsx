import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Εισαγωγή της "έξυπνης" συνάρτησης fetch
import { fetchWithAuth } from '../utils/api';

export default function MyReservations() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [userName, setUserName] = useState<string>('');
  const [userImage, setUserImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  const insets = useSafeAreaInsets(); 

  // ΒΑΛΕ ΕΔΩ ΤΗΝ IP ΣΟΥ!
  const SERVER_URL = 'http://192.168.2.5:3000'; 

  const forceLogout = async () => {
    if (Platform.OS === 'web') {
      localStorage.removeItem('userToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userId');
      localStorage.removeItem('userName');
      localStorage.removeItem('userImage');
    } else {
      await SecureStore.deleteItemAsync('userToken');
      await SecureStore.deleteItemAsync('refreshToken');
      await SecureStore.deleteItemAsync('userId');
      await SecureStore.deleteItemAsync('userName');
      await SecureStore.deleteItemAsync('userImage');
    }
    router.replace('/'); 
  };

  const fetchReservations = async () => {
    let userId = null;
    let name = null;

    // Προσπαθούμε να πάρουμε το ID από τη μνήμη
    if (Platform.OS === 'web') {
      userId = localStorage.getItem('userId');
      name = localStorage.getItem('userName');
    } else {
      userId = await SecureStore.getItemAsync('userId');
      name = await SecureStore.getItemAsync('userName');
    }

    if (!userId) {
      setIsLoggedIn(false);
      setLoading(false);
      return; 
    }
    
    setIsLoggedIn(true);
    setUserName(name || 'Χρήστη');

    // === ΝΕΟ 1: ΖΗΤΑΜΕ ΤΟ ΠΡΟΦΙΛ (ΚΑΙ ΤΗ ΦΩΤΟ) ΑΠΟ ΤΟΝ SERVER ΠΑΝΤΑ ===
    try {
      const profileRes = await fetchWithAuth(`${SERVER_URL}/user/profile/${userId}`, { method: 'GET' });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        
        // Ενημερώνουμε το state με τα ΦΡΕΣΚΑ δεδομένα της βάσης
        if (profileData.name) setUserName(profileData.name);
        
        if (profileData.profile_picture) {
          setUserImage(profileData.profile_picture);
          if (Platform.OS !== 'web') await SecureStore.setItemAsync('userImage', profileData.profile_picture);
        } else {
          setUserImage(null);
          if (Platform.OS !== 'web') await SecureStore.deleteItemAsync('userImage');
        }
      }
    } catch (error) {
      console.log("Δεν μπορέσαμε να φορτώσουμε τη φωτογραφία", error);
    }

    // === ΝΕΟ 2: ΖΗΤΑΜΕ ΤΙΣ ΚΡΑΤΗΣΕΙΣ ===
    fetchWithAuth(`${SERVER_URL}/user/reservations/${userId}`, {
      method: 'GET'
    })
      .then(response => {
        if (response.status === 401 || response.status === 403) {
          Alert.alert("Η συνεδρία έληξε", "Το ασφαλές session έληξε. Παρακαλώ συνδεθείτε ξανά.");
          forceLogout();
          throw new Error("Σφάλμα εξουσιοδότησης");
        }
        if (!response.ok) throw new Error("Πρόβλημα Server");
        return response.json();
      })
      .then(data => {
        setReservations(data);
        setLoading(false);
      })
      .catch(error => {
        console.log(error);
        setLoading(false);
      });
  };

  useFocusEffect(
    useCallback(() => {
      fetchReservations();
    }, [])
  );

  const handleLogoutPress = () => {
    Alert.alert("Αποσύνδεση", "Είσαι σίγουρος ότι θέλεις να αποσυνδεθείς;", [
      { text: "Ακύρωση", style: "cancel" },
      { text: "Ναι, Έξοδος", style: "destructive", onPress: forceLogout }
    ]);
  };

  const handleCancel = async (reservationId: number) => {
    let userId = Platform.OS === 'web' ? localStorage.getItem('userId') : await SecureStore.getItemAsync('userId');

    Alert.alert("Ακύρωση Εισιτηρίου", "Είσαι σίγουρος ότι θέλεις να ακυρώσεις την κράτηση; Οι θέσεις θα ελευθερωθούν.", [
      { text: "Όχι", style: "cancel" },
      { 
        text: "Ναι, Ακύρωση", style: "destructive",
        onPress: async () => {
          try {
            const response = await fetchWithAuth(`${SERVER_URL}/reservations/${reservationId}/${userId}`, {
              method: 'DELETE'
            });

            if (response.ok) {
              fetchReservations(); 
              Alert.alert("Επιτυχία", "Η κράτησή σου ακυρώθηκε.");
            } else {
              Alert.alert("Σφάλμα", "Δεν ήταν δυνατή η ακύρωση.");
            }
          } catch (error) {
            Alert.alert("Σφάλμα", "Πρόβλημα σύνδεσης");
          }
        }
      }
    ]);
  };

  const handleEdit = (reservationId: number, showtimeId: number, oldSeats: string) => {
    router.push(`/book/${showtimeId}?editMode=true&reservationId=${reservationId}&oldSeats=${oldSeats}`);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#d4af37" /></View>;

  if (!isLoggedIn) {
    return (
      <View style={[styles.guestContainer, { paddingTop: insets.top + 20 }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Ionicons name="lock-closed-outline" size={100} color="#1e293b" style={{ marginBottom: 20 }} />
        <Text style={styles.guestTitle}>Απαιτείται Σύνδεση</Text>
        <Text style={styles.guestSubtitle}>Γίνε μέλος για να διαχειρίζεσαι τα εισιτήρια και το προφίλ σου εύκολα και γρήγορα!</Text>
        <TouchableOpacity style={styles.loginBtnPrimary} onPress={() => router.push('/')}>
          <Text style={styles.loginBtnPrimaryText}>Σύνδεση / Εγγραφή</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <TouchableOpacity 
        style={styles.profileHeader} 
        activeOpacity={0.7}
        onPress={() => router.push('/profile/settings')}
      >
        <View style={styles.avatarContainer}>
          {userImage ? (
            <Image source={{ uri: userImage }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person-circle" size={54} color="#d4af37" />
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.greeting}>Γεια σου, {userName}</Text>
          <Text style={styles.subtitle}>Επεξεργασία Προφίλ & Ρυθμίσεις</Text>
        </View>
        <View style={styles.chevronBtn}>
          <Ionicons name="chevron-forward-outline" size={24} color="#94a3b8" />
        </View>
      </TouchableOpacity>
      
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="ticket" size={20} color="#f8fafc" style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>Οι Κρατήσεις μου</Text>
        </View>
        
        <TouchableOpacity style={styles.logoutTextBtn} onPress={handleLogoutPress}>
          <Ionicons name="log-out-outline" size={18} color="#ef4444" style={{ marginRight: 4 }} />
          <Text style={styles.logoutText}>Έξοδος</Text>
        </TouchableOpacity>
      </View>

      {reservations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="ticket-outline" size={60} color="#334155" />
          <Text style={styles.noShows}>Δεν έχεις καμία ενεργή κράτηση.</Text>
        </View>
      ) : (
        <FlatList 
          data={reservations}
          keyExtractor={(item) => item.reservation_id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 30 }}
          renderItem={({ item }) => {
            const displayDate = new Date(item.show_date).toLocaleDateString('el-GR');
            const displayTime = item.show_time.substring(0, 5);

            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.title}>{item.title}</Text>
                </View>
                
                <View style={styles.cardBody}>
                  <View style={styles.theatreSection}>
                    <Text style={styles.theatreName}>🎭 {item.theatre_name || 'Άγνωστο Θέατρο'}</Text>
                    <Text style={styles.locationText}>📍 {item.theatre_location || item.location || 'Δεν ορίστηκε τοποθεσία'}</Text>
                  </View>

                  <View style={styles.dividerSmall} />

                  <View style={styles.dateTimeRow}>
                    <View style={styles.infoRow}>
                      <Ionicons name="calendar-outline" size={16} color="#94a3b8" />
                      <Text style={styles.details}>{displayDate}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Ionicons name="time-outline" size={16} color="#94a3b8" />
                      <Text style={styles.details}>{displayTime}</Text>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <Ionicons name="stop-circle-outline" size={16} color="#d4af37" />
                    <Text style={styles.seats}>Θέσεις: {item.seat_numbers || item.seat_number}</Text>
                  </View>
                </View>

                <View style={styles.divider} />
                
                <View style={styles.cardBottom}>
                  <View>
                    <Text style={styles.priceLabel}>Σύνολο</Text>
                    <Text style={styles.price}>{item.total_price || item.price}€</Text>
                  </View>
                  
                  <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.editButton} onPress={() => handleEdit(item.reservation_id, item.showtime_id, item.seat_numbers)}>
                      <Ionicons name="create-outline" size={18} color="#38bdf8" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.cancelButton} onPress={() => handleCancel(item.reservation_id)}>
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, backgroundColor: '#020617' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
  
  guestContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617', paddingHorizontal: 30 },
  guestTitle: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc', marginBottom: 10 },
  guestSubtitle: { fontSize: 15, color: '#94a3b8', textAlign: 'center', marginBottom: 30, lineHeight: 22 },
  loginBtnPrimary: { backgroundColor: '#d4af37', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 12, width: '100%', alignItems: 'center' },
  loginBtnPrimaryText: { color: '#020617', fontSize: 16, fontWeight: 'bold' },

  profileHeader: { backgroundColor: '#0f172a', padding: 18, borderRadius: 16, marginBottom: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#1e293b' },
  avatarContainer: { marginRight: 15, justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: 54, height: 54, borderRadius: 27, borderWidth: 1, borderColor: '#d4af37' },
  userInfo: { flex: 1 },
  greeting: { fontSize: 20, fontWeight: '800', color: '#f8fafc', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#94a3b8' },
  chevronBtn: { padding: 5 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc' },
  logoutTextBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 10, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
  logoutText: { color: '#ef4444', fontWeight: 'bold', fontSize: 13 },

  card: { backgroundColor: '#0f172a', borderRadius: 16, marginBottom: 18, borderWidth: 1, borderColor: '#1e293b', overflow: 'hidden' },
  cardTop: { backgroundColor: '#1e293b', padding: 15, borderLeftWidth: 4, borderLeftColor: '#d4af37' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc' },
  
  cardBody: { padding: 15 },
  theatreSection: { marginBottom: 10 },
  theatreName: { fontSize: 15, fontWeight: 'bold', color: '#d4af37', marginBottom: 4 },
  locationText: { fontSize: 13, color: '#94a3b8' },
  
  dateTimeRow: { flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginRight: 20, marginBottom: 5 },
  details: { fontSize: 14, color: '#cbd5e1', marginLeft: 8 },
  seats: { fontSize: 14, color: '#f8fafc', fontWeight: 'bold', marginLeft: 8 },
  
  dividerSmall: { height: 1, backgroundColor: '#1e293b', marginVertical: 10 },
  divider: { height: 1, backgroundColor: '#1e293b' },
  
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: 'rgba(15, 23, 42, 0.5)' },
  priceLabel: { color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  price: { fontSize: 20, color: '#f8fafc', fontWeight: 'bold' },
  
  actionButtons: { flexDirection: 'row' },
  editButton: { backgroundColor: 'rgba(56, 189, 248, 0.1)', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.2)', marginRight: 10 },
  cancelButton: { backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)' },
  
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  noShows: { textAlign: 'center', fontSize: 16, color: '#64748b', marginTop: 15 }
});