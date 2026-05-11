import { Stack, router, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function SeatSelection() {
  // ΝΕΟ: Διαβάζουμε τις παραμέτρους επεξεργασίας από το URL
  const { id, editMode, reservationId, oldSeats } = useLocalSearchParams(); 
  
  const [takenSeats, setTakenSeats] = useState<string[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // ΒΑΛΕ ΕΔΩ ΤΗΝ IP ΣΟΥ!
  const SERVER_URL = 'http://192.168.2.5:3000'; 

  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const cols = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  // ΝΕΟ: Αν είμαστε σε Edit Mode, βάζουμε τις παλιές θέσεις ως ήδη επιλεγμένες
  useEffect(() => {
    if (editMode === 'true' && oldSeats && typeof oldSeats === 'string') {
      setSelectedSeats(oldSeats.split(','));
    }
  }, [editMode, oldSeats]);

  useEffect(() => {
    fetch(`${SERVER_URL}/seats/${id}`)
      .then(res => res.json())
      .then(data => {
        // ΝΕΟ: Αν είμαστε σε επεξεργασία, αφαιρούμε τις δικές μας παλιές θέσεις 
        // από τη λίστα των "Πιασμένων" για να μπορούμε να τις ξε-τικάρουμε!
        if (editMode === 'true' && oldSeats && typeof oldSeats === 'string') {
          const myOldSeats = oldSeats.split(',');
          const trulyTaken = data.filter((seat: string) => !myOldSeats.includes(seat));
          setTakenSeats(trulyTaken);
        } else {
          setTakenSeats(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Σφάλμα σύνδεσης:", err);
        setLoading(false);
        setTakenSeats(['A1', 'C5', 'D4', 'D5', 'H10']); 
      });
  }, [id, editMode, oldSeats]);

  const toggleSeat = (seat: string) => {
    if (takenSeats.includes(seat)) return; 
    if (selectedSeats.includes(seat)) {
      setSelectedSeats(selectedSeats.filter(s => s !== seat)); 
    } else {
      setSelectedSeats([...selectedSeats, seat]); 
    }
  };

  const handleBooking = async () => {
    if (selectedSeats.length === 0) {
      Alert.alert("Προσοχή", "Επίλεξε τουλάχιστον μία θέση!");
      return;
    }

    const userId = await SecureStore.getItemAsync('userId');
    const token = await SecureStore.getItemAsync('userToken');

    if (!userId || !token) {
      Alert.alert("Απαιτείται Σύνδεση", "Πρέπει να συνδεθείς ή να κάνεις εγγραφή.", [{ text: "ΟΚ" }]);
      return;
    }

    try {
      // ΝΕΟ: Ελέγχουμε αν κάνουμε Νέα Κράτηση (POST) ή Επεξεργασία (PUT)
      const isEdit = editMode === 'true';
      const url = isEdit 
        ? `${SERVER_URL}/reservations/${reservationId}/${userId}` 
        : `${SERVER_URL}/reservations`;
      const method = isEdit ? 'PUT' : 'POST';

      // Φτιάχνουμε το σωστό Body ανάλογα με το endpoint του Server μας
      const bodyData = isEdit 
        ? {
            new_seats_booked: selectedSeats.length,
            new_seat_numbers: selectedSeats.join(','),
            showtime_id: id
          }
        : {
            user_id: userId,
            showtime_id: id,
            seats_booked: selectedSeats.length,
            seat_numbers: selectedSeats.join(',') 
          };

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bodyData)
      });

      // --- ΝΕΟ: Έλεγχος για Ταυτόχρονες Κρατήσεις (409 Conflict) ---
      if (response.status === 409) {
        const errorData = await response.json();
        Alert.alert("Προσοχή!", errorData.error);
        
        // Καθαρίζουμε τις επιλεγμένες θέσεις και ξανατραβάμε τα δεδομένα 
        // για να δει ο χρήστης ποιες θέσεις πιάστηκαν στο ενδιάμεσο!
        setSelectedSeats([]);
        fetch(`${SERVER_URL}/seats/${id}`)
          .then(res => res.json())
          .then(data => setTakenSeats(data));
        return;
      }

      if (response.ok) {
        Alert.alert(
          "Επιτυχία!", 
          isEdit ? "Οι αλλαγές στην κράτησή σου αποθηκεύτηκαν!" : `Έκλεισες τις θέσεις: ${selectedSeats.join(', ')}`
        );
        router.back(); 
      } else {
        // Διαβάζουμε το ακριβές μήνυμα λάθους από τον Server
        const errorData = await response.json();
        Alert.alert("Σφάλμα", errorData.error || "Κάτι πήγε στραβά με την κράτηση.");
      }
    } catch (error) {
      Alert.alert("Σφάλμα", "Πρόβλημα σύνδεσης με τον Server.");
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#d4af37" /></View>;

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: editMode === 'true' ? 'Επεξεργασία Θέσεων' : 'Επιλογή Θέσεων', 
          headerTintColor: '#d4af37', 
          headerStyle: { backgroundColor: '#0f172a' },
          headerBackTitle: 'Πίσω'
        }} 
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.theatreLayout}>
          
          <View style={styles.screen}>
            <Text style={styles.screenText}>Σ Κ Η Ν Η</Text>
          </View>

          <View style={styles.grid}>
            {rows.map(row => (
              <View key={row} style={styles.row}>
                <Text style={styles.rowLabel}>{row}</Text>
                
                {cols.map(col => {
                  const seatId = `${row}${col}`;
                  const isTaken = takenSeats.includes(seatId);
                  const isSelected = selectedSeats.includes(seatId);

                  let seatBgColor = '#1e293b'; 
                  let seatBorderColor = '#334155';
                  let seatBottomColor = '#0f172a'; 
                  let textColor = '#f8fafc';

                  if (isTaken) {
                    seatBgColor = '#ef4444';
                    seatBorderColor = '#7f1d1d';
                    seatBottomColor = '#450a0a';
                    textColor = '#fca5a5';
                  } else if (isSelected) {
                    seatBgColor = '#d4af37';
                    seatBorderColor = '#b4942d';
                    seatBottomColor = '#8c7322';
                    textColor = '#020617';
                  }

                  return (
                    <React.Fragment key={seatId}>
                      {(col === 4 || col === 8) && <View style={styles.aisle} />}
                      
                      <TouchableOpacity
                        style={[
                          styles.seat, 
                          { 
                            backgroundColor: seatBgColor,
                            borderColor: seatBorderColor,
                            borderBottomColor: seatBottomColor
                          },
                          isTaken && { opacity: 0.4 } 
                        ]}
                        onPress={() => toggleSeat(seatId)}
                        disabled={isTaken}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.seatText, { color: textColor }]}>{col}</Text>
                      </TouchableOpacity>
                    </React.Fragment>
                  );
                })}
                
                <Text style={styles.rowLabel}>{row}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.legend}>
          <View style={[styles.legendBox, { backgroundColor: '#1e293b', borderBottomColor: '#0f172a' }]} />
          <Text style={styles.legendText}>Ελεύθερη</Text>
          
          <View style={[styles.legendBox, { backgroundColor: '#d4af37', borderBottomColor: '#8c7322' }]} />
          <Text style={styles.legendText}>Επιλογή</Text>
          
          <View style={[styles.legendBox, { backgroundColor: '#ef4444', borderBottomColor: '#450a0a', opacity: 0.4 }]} />
          <Text style={styles.legendText}>Πιασμένη</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Σύνοψη Κράτησης</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoText}>Επιλεγμένες Θέσεις:</Text>
            <Text style={styles.infoValue}>{selectedSeats.join(', ') || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoText}>Σύνολο Εισιτηρίων:</Text>
            <Text style={styles.infoValue}>{selectedSeats.length}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.bookButton, selectedSeats.length === 0 && styles.bookButtonDisabled]} 
          onPress={handleBooking}
          disabled={selectedSeats.length === 0}
        >
          <Text style={styles.bookButtonText}>
            {editMode === 'true' ? 'Αποθήκευση Αλλαγών' : 'Ολοκλήρωση Κράτησης'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' }, 
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
  scrollContent: { padding: 10 }, 
  
  theatreLayout: { alignItems: 'center', width: '100%' },
  
  screen: { width: '85%', height: 35, backgroundColor: '#0f172a', borderTopLeftRadius: 30, borderTopRightRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 35, borderWidth: 1, borderBottomWidth: 0, borderColor: '#334155' },
  screenText: { color: '#94a3b8', fontWeight: 'bold', letterSpacing: 10, fontSize: 12 },
  
  grid: { alignItems: 'center' },
  row: { flexDirection: 'row', marginBottom: 8, alignItems: 'center', justifyContent: 'center' },
  
  rowLabel: { color: '#64748b', fontWeight: 'bold', fontSize: 12, width: 14, textAlign: 'center', marginHorizontal: 2 },
  aisle: { width: 14 }, 
  
  seat: { 
    width: 27, 
    height: 30, 
    marginHorizontal: 2, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderBottomWidth: 4, 
    borderTopLeftRadius: 8, 
    borderTopRightRadius: 8, 
    borderBottomLeftRadius: 2, 
    borderBottomRightRadius: 2 
  },
  seatText: { fontSize: 10, fontWeight: 'bold' },
  
  legend: { flexDirection: 'row', justifyContent: 'center', marginTop: 15, marginBottom: 30 },
  legendBox: { width: 18, height: 20, borderTopLeftRadius: 6, borderTopRightRadius: 6, borderBottomLeftRadius: 2, borderBottomRightRadius: 2, marginHorizontal: 6, borderWidth: 1, borderBottomWidth: 4 },
  legendText: { color: '#94a3b8', marginRight: 15, fontSize: 11, marginTop: 4 },
  
  infoBox: { backgroundColor: '#0f172a', padding: 20, borderRadius: 15, marginBottom: 20, borderWidth: 1, borderColor: '#1e293b' },
  infoTitle: { color: '#f8fafc', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  infoText: { color: '#94a3b8', fontSize: 14 },
  infoValue: { color: '#d4af37', fontSize: 15, fontWeight: 'bold' },
  
  bookButton: { backgroundColor: '#d4af37', padding: 18, borderRadius: 12, alignItems: 'center' },
  bookButtonDisabled: { backgroundColor: '#334155', opacity: 0.7 },
  bookButtonText: { color: '#020617', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 }
});