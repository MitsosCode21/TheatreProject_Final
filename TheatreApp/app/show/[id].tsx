import { Link, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Βοηθητική συνάρτηση για να φτιάχνουμε τα ωραία ελληνικά καρτελάκια
const formatTabDate = (dateStr: string) => {
  const d = new Date(dateStr);
  const days = ['ΚΥΡ', 'ΔΕΥ', 'ΤΡΙ', 'ΤΕΤ', 'ΠΕΜ', 'ΠΑΡ', 'ΣΑΒ'];
  const months = ['ΙΑΝ', 'ΦΕΒ', 'ΜΑΡ', 'ΑΠΡ', 'ΜΑΙ', 'ΙΟΥΝ', 'ΙΟΥΛ', 'ΑΥΓ', 'ΣΕΠ', 'ΟΚΤ', 'ΝΟΕ', 'ΔΕΚ'];
  return {
    dayName: days[d.getDay()],
    dayNum: d.getDate(),
    monthName: months[d.getMonth()]
  };
};

export default function ShowDetails() {
  const { id } = useLocalSearchParams(); 
  const [show, setShow] = useState<any>(null);
  const [theatre, setTheatre] = useState<any>(null);
  const [showtimes, setShowtimes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // ΝΕΟ: Κρατάμε την επιλεγμένη ημερομηνία
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // ΒΑΛΕ ΕΔΩ ΤΗΝ IP ΣΟΥ!
  const SERVER_URL = 'http://192.168.2.5:3000'; 

  useEffect(() => {
    const fetchData = async () => {
      try {
        const showsRes = await fetch(`${SERVER_URL}/shows`);
        const showsData = await showsRes.json();
        const currentShow = showsData.find((s: any) => s.show_id.toString() === id);
        setShow(currentShow);

        if (currentShow) {
          const theatresRes = await fetch(`${SERVER_URL}/theatres`);
          const theatresData = await theatresRes.json();
          const currentTheatre = theatresData.find((t: any) => t.theatre_id === currentShow.theatre_id);
          setTheatre(currentTheatre);
        }

        const timesRes = await fetch(`${SERVER_URL}/showtimes/${id}`);
        const timesData = await timesRes.json();
        
        // Φιλτράρουμε την ημερομηνία για να την ομαδοποιήσουμε εύκολα (π.χ. "2026-05-04")
        const normalizedTimes = timesData.map((t: any) => ({
          ...t,
          normalizedDate: new Date(t.show_date).toISOString().split('T')[0]
        }));
        
        setShowtimes(normalizedTimes);
        
        // Ορίζουμε την πρώτη διαθέσιμη ημερομηνία ως προεπιλεγμένη
        if (normalizedTimes.length > 0) {
          setSelectedDate(normalizedTimes[0].normalizedDate);
        }

      } catch (error) {
        console.error("Σφάλμα:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#d4af37" /></View>;
  if (!show) return <View style={styles.center}><Text style={styles.errorText}>Η παράσταση δεν βρέθηκε.</Text></View>;

  // Βρίσκουμε τις ΜΟΝΑΔΙΚΕΣ ημερομηνίες για τα πάνω καρτελάκια
  const uniqueDates = Array.from(new Set(showtimes.map(st => st.normalizedDate))).sort();
  
  // Βρίσκουμε τις ώρες ΜΟΝΟ για την επιλεγμένη ημερομηνία
  const timesForSelectedDate = showtimes.filter(st => st.normalizedDate === selectedDate);

  return (
    <View style={styles.mainContainer}>
      <Stack.Screen 
        options={{ 
          title: "Πληροφορίες",
          headerStyle: { backgroundColor: '#0f172a' },
          headerTintColor: '#d4af37',
          headerBackTitle: 'Πίσω'
        }} 
      />
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: show.image_url || 'https://images.unsplash.com/photo-1533104816-cdd23114421b?w=800&q=80' }} style={styles.coverImage} />
          <View style={styles.imageOverlay} />
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.title}>{show.title}</Text>
          <Text style={styles.theatreName}>📍 {theatre ? theatre.name : 'Άγνωστο Θέατρο'}  •  🔞 {show.age_rating || 'Όλες οι ηλικίες'}</Text>
          
          <View style={styles.infoBar}>
            <Text style={styles.infoText}>🎭 {show.category || 'Θέατρο'}</Text>
            <Text style={styles.infoText}>⏳ {show.duration ? `${show.duration}'` : '--'}</Text>
            <Text style={styles.infoText}>⭐ {show.rating || '-'}/5</Text>
          </View>

          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Σχετικά με την παράσταση</Text>
          <Text style={styles.description}>
            {show.description ? show.description.replace(/\\n/g, '\n') : 'Δεν υπάρχει αναλυτική περιγραφή.'}
          </Text>
          <View style={styles.divider} />

          {/* ===== ΕΠΙΛΟΓΗ ΗΜΕΡΟΜΗΝΙΑΣ (VILLAGE STYLE) ===== */}
          <Text style={styles.sectionTitle}>Πρόγραμμα Παραστάσεων</Text>
          
          {uniqueDates.length === 0 ? (
            <Text style={styles.noShows}>Δεν υπάρχουν διαθέσιμες ώρες.</Text>
          ) : (
            <>
              {/* Οριζόντια μπάρα Ημερομηνιών */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateSelectorContainer}>
                {uniqueDates.map((dateStr) => {
                  const { dayName, dayNum, monthName } = formatTabDate(dateStr);
                  const isSelected = selectedDate === dateStr;

                  return (
                    <TouchableOpacity 
                      key={dateStr} 
                      style={[styles.dateTab, isSelected && styles.dateTabSelected]}
                      onPress={() => setSelectedDate(dateStr)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.dayName, isSelected && styles.textSelected]}>{dayName}</Text>
                      <Text style={[styles.dayNum, isSelected && styles.textSelected]}>{dayNum}</Text>
                      <Text style={[styles.monthName, isSelected && styles.textSelected]}>{monthName}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Λίστα με τις Ώρες για την επιλεγμένη ημερομηνία */}
              <View style={styles.timesContainer}>
                {timesForSelectedDate.map((st) => (
                  <Link href={`/book/${st.showtime_id}`} asChild key={st.showtime_id}>
                    <TouchableOpacity style={styles.timeCard} activeOpacity={0.8}>
                      <View style={styles.timeInfoLeft}>
                        <Text style={styles.timeText}>{st.show_time.substring(0, 5)}</Text>
                        <Text style={styles.roomText}>{st.room_name || show.room_name || 'Κεντρική Σκηνή'}</Text>
                      </View>
                      
                      <View style={styles.priceBtn}>
                        <Text style={styles.priceText}>{st.price}€</Text>
                      </View>
                    </TouchableOpacity>
                  </Link>
                ))}
              </View>
            </>
          )}
          
          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#020617' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
  errorText: { color: '#ef4444', fontSize: 18 },
  imageContainer: { width: '100%', height: 350, position: 'relative' },
  coverImage: { width: '100%', height: '100%' },
  imageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(2, 6, 23, 0.4)' },
  contentContainer: { backgroundColor: '#020617', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, marginTop: -35, minHeight: 500 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#f8fafc', marginBottom: 5 },
  theatreName: { fontSize: 16, color: '#d4af37', marginBottom: 20, fontWeight: 'bold' },
  infoBar: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#0f172a', padding: 15, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#1e293b' },
  infoText: { color: '#cbd5e1', fontSize: 14, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#1e293b', marginVertical: 20 },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', color: '#f8fafc', marginBottom: 15 },
  description: { fontSize: 16, color: '#cbd5e1', lineHeight: 28, textAlign: 'left', letterSpacing: 0.3, opacity: 0.9 },
  noShows: { color: '#64748b', fontSize: 15, fontStyle: 'italic', marginTop: 10 },
  bottomSpacer: { height: 40 },

  // ΣΤΥΛ ΓΙΑ ΤΑ ΝΕΑ VILLAGE-STYLE TABS
  dateSelectorContainer: { marginBottom: 20 },
  dateTab: { 
    backgroundColor: '#0f172a', 
    paddingVertical: 12, 
    paddingHorizontal: 20, 
    borderRadius: 12, 
    marginRight: 10, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b'
  },
  dateTabSelected: { 
    backgroundColor: '#1e293b', 
    borderColor: '#d4af37', 
    borderBottomWidth: 3 
  },
  dayName: { color: '#64748b', fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
  dayNum: { color: '#cbd5e1', fontSize: 22, fontWeight: 'bold', marginBottom: 2 },
  monthName: { color: '#64748b', fontSize: 12, fontWeight: 'bold' },
  textSelected: { color: '#f8fafc' }, 

  // ΣΤΥΛ ΓΙΑ ΤΙΣ ΩΡΕΣ ΑΠΟ ΚΑΤΩ (ΔΙΟΡΘΩΜΕΝΑ FLEXBOX)
  timesContainer: { marginTop: 10 },
  timeCard: { 
    backgroundColor: '#0f172a', 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 12, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#1e293b' 
  },
  timeInfoLeft: { 
    flex: 1, // Διορθώνει το πρόβλημα με τα μεγάλα ονόματα
    flexDirection: 'row', 
    alignItems: 'center',
    paddingRight: 10 // Αφήνει λίγο χώρο από την τιμή
  },
  timeText: { 
    fontSize: 24, 
    color: '#f8fafc', 
    fontWeight: 'bold', 
    marginRight: 15 
  },
  roomText: { 
    flex: 1, // Επιτρέπει στο κείμενο να "σπάσει" αν χρειαστεί
    fontSize: 14, 
    color: '#94a3b8' 
  },
  priceBtn: { 
    flexShrink: 0, // Απαγορεύει στο κουμπί να μικρύνει
    backgroundColor: '#1e293b', 
    paddingVertical: 8, 
    paddingHorizontal: 15, 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: '#334155' 
  },
  priceText: { color: '#d4af37', fontWeight: 'bold', fontSize: 15 },
});