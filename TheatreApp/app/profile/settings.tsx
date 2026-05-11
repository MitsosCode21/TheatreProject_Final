import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchWithAuth } from '../utils/api';

export default function Settings() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  
  // States για Προφίλ
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [image, setImage] = useState<string | null>(null);
  
  // ΝΕΑ States για Κωδικό
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const SERVER_URL = 'http://192.168.2.5:3000'; // Βάλε την IP σου!

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const storedName = await SecureStore.getItemAsync('userName');
      if (storedName) setName(storedName);

      const userId = await SecureStore.getItemAsync('userId');
      if (!userId) return;

      const response = await fetchWithAuth(`${SERVER_URL}/user/profile/${userId}`, { method: 'GET' });
      
      if (response.ok) {
        const userData = await response.json();
        setPhone(userData.phone || ''); 
        setImage(userData.profile_picture || null);
      }
    } catch (error) {
      console.log("Σφάλμα φόρτωσης δεδομένων:", error);
    } finally {
      setInitialLoad(false);
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Απαιτείται άδεια', 'Χρειαζόμαστε πρόσβαση στις φωτογραφίες σας.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], 
      quality: 0.3,   
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets[0].base64) {
      const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setImage(base64Img);
    }
  };

  const removeImage = () => {
    Alert.alert("Διαγραφή", "Θέλετε σίγουρα να αφαιρέσετε τη φωτογραφία προφίλ;", [
      { text: "Ακύρωση", style: "cancel" },
      { text: "Ναι, Αφαίρεση", style: "destructive", onPress: () => setImage(null) }
    ]);
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert("Σφάλμα", "Το όνομα δεν μπορεί να είναι κενό.");
      return;
    }

    setLoading(true);
    const userId = await SecureStore.getItemAsync('userId');
    
    if (!userId) return setLoading(false);

    try {
      const response = await fetchWithAuth(`${SERVER_URL}/user/profile/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone: phone.trim(), profile_picture: image }),
      });

      if (response.ok) {
        await SecureStore.setItemAsync('userName', name);
        if (!image) await SecureStore.deleteItemAsync('userImage');
        else await SecureStore.setItemAsync('userImage', image);
        
        Alert.alert("Επιτυχία", "Οι αλλαγές στο προφίλ αποθηκεύτηκαν!", [{ text: "ΟΚ", onPress: () => router.back() }]);
      } else {
        Alert.alert("Σφάλμα", "Αποτυχία ενημέρωσης.");
      }
    } catch (error) {
      Alert.alert("Σφάλμα", "Πρόβλημα σύνδεσης με τον server.");
    } finally {
      setLoading(false);
    }
  };

  // ΝΕΑ ΣΥΝΑΡΤΗΣΗ: Αλλαγή Κωδικού
  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert("Προσοχή", "Παρακαλώ συμπληρώστε όλα τα πεδία κωδικού.");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Σφάλμα", "Οι νέοι κωδικοί δεν ταιριάζουν.");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Αδύναμος Κωδικός", "Ο νέος κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες.");
      return;
    }

    setPasswordLoading(true);
    const userId = await SecureStore.getItemAsync('userId');

    try {
      const response = await fetchWithAuth(`${SERVER_URL}/user/change-password/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Επιτυχία", "Ο κωδικός σας άλλαξε με επιτυχία!");
        // Καθαρίζουμε τα πεδία
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert("Σφάλμα", data.error || "Αποτυχία αλλαγής κωδικού.");
      }
    } catch (error) {
      Alert.alert("Σφάλμα", "Πρόβλημα σύνδεσης με τον server.");
    } finally {
      setPasswordLoading(false);
    }
  };

  if (initialLoad) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#d4af37" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView 
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={{ paddingBottom: 60 }} 
        showsVerticalScrollIndicator={false}
      >
        <Stack.Screen 
          options={{ 
            title: 'Επεξεργασία Προφίλ', 
            headerTransparent: true, 
            headerTintColor: '#d4af37',
            headerBackTitle: 'Πίσω', 
            headerShadowVisible: false
          }} 
        />
        
        {/* === ΕΝΟΤΗΤΑ ΠΡΟΦΙΛ === */}
        <View style={styles.header}>
          <TouchableOpacity onPress={pickImage} style={styles.imageContainer} activeOpacity={0.8}>
            {image ? (
              <Image source={{ uri: image }} style={styles.profileImg} />
            ) : (
              <View style={styles.placeholderImg}>
                <Ionicons name="camera" size={40} color="#d4af37" />
              </View>
            )}
            <View style={styles.editBadge}>
              <Ionicons name="pencil" size={14} color="#020617" />
            </View>
          </TouchableOpacity>
          
          {image ? (
            <TouchableOpacity style={styles.removeBtn} onPress={removeImage}>
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
              <Text style={styles.removeBtnText}>Αφαίρεση Φωτογραφίας</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.infoText}>Πατήστε για προσθήκη φωτογραφίας</Text>
          )}
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Ονοματεπώνυμο</Text>
          <TextInput 
            style={styles.input} 
            value={name} 
            onChangeText={setName} 
            placeholder="Το όνομά σας" 
            placeholderTextColor="#475569"
            autoCapitalize="words"
            clearButtonMode="while-editing"
          />

          <Text style={styles.label}>Τηλέφωνο (Προαιρετικό)</Text>
          <TextInput 
            style={styles.input} 
            value={phone} 
            onChangeText={setPhone} 
            placeholder="Προσθέστε τηλέφωνο" 
            keyboardType="phone-pad" 
            placeholderTextColor="#475569" 
            maxLength={10}
            clearButtonMode="while-editing"
          />
        </View>

        <TouchableOpacity 
          style={[styles.saveBtn, loading && styles.saveBtnDisabled]} 
          onPress={handleSaveProfile} 
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#020617" /> : <Text style={styles.saveBtnText}>Αποθήκευση Προφίλ</Text>}
        </TouchableOpacity>


        {/* === ΝΕΑ ΕΝΟΤΗΤΑ: ΑΛΛΑΓΗ ΚΩΔΙΚΟΥ === */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ΑΛΛΑΓΗ ΚΩΔΙΚΟΥ</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Τρέχων Κωδικός</Text>
          <TextInput 
            style={styles.input} 
            value={oldPassword} 
            onChangeText={setOldPassword} 
            placeholder="Πληκτρολογήστε τον παλιό κωδικό" 
            placeholderTextColor="#475569"
            secureTextEntry
          />

          <Text style={styles.label}>Νέος Κωδικός</Text>
          <TextInput 
            style={styles.input} 
            value={newPassword} 
            onChangeText={setNewPassword} 
            placeholder="Τουλάχιστον 6 χαρακτήρες" 
            placeholderTextColor="#475569"
            secureTextEntry
          />

          <Text style={styles.label}>Επιβεβαίωση Νέου Κωδικού</Text>
          <TextInput 
            style={styles.input} 
            value={confirmPassword} 
            onChangeText={setConfirmPassword} 
            placeholder="Ξαναγράψτε τον νέο κωδικό" 
            placeholderTextColor="#475569"
            secureTextEntry
          />
        </View>

        <TouchableOpacity 
          style={[styles.saveBtnPassword, passwordLoading && styles.saveBtnDisabled]} 
          onPress={handleChangePassword} 
          disabled={passwordLoading}
        >
          {passwordLoading ? (
            <ActivityIndicator color="#d4af37" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="lock-closed-outline" size={18} color="#d4af37" style={{ marginRight: 8 }} />
              <Text style={styles.saveBtnPasswordText}>Ενημέρωση Κωδικού</Text>
            </View>
          )}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617', paddingHorizontal: 20 },
  center: { justifyContent: 'center', alignItems: 'center' },
  
  header: { alignItems: 'center', marginTop: 40, marginBottom: 20 },
  imageContainer: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#d4af37', elevation: 5, shadowColor: '#d4af37', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5 },
  profileImg: { width: 116, height: 116, borderRadius: 58 },
  placeholderImg: { alignItems: 'center' },
  editBadge: { position: 'absolute', bottom: 5, right: 5, backgroundColor: '#d4af37', padding: 8, borderRadius: 15, borderWidth: 2, borderColor: '#020617' },
  
  infoText: { color: '#94a3b8', marginTop: 15, fontSize: 13 },
  removeBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 15, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
  removeBtnText: { color: '#ef4444', fontSize: 13, fontWeight: 'bold', marginLeft: 5 },
  
  form: { marginTop: 10 },
  label: { color: '#d4af37', fontSize: 14, fontWeight: 'bold', marginBottom: 8, marginLeft: 4 },
  input: { backgroundColor: '#0f172a', color: '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#1e293b', fontSize: 16 },
  
  saveBtn: { backgroundColor: '#d4af37', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 5, elevation: 3 },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: '#020617', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.5 },

  // Νέα Styles για τη γραμμή διαχωρισμού
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 35 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#1e293b' },
  dividerText: { color: '#64748b', fontSize: 12, fontWeight: 'bold', letterSpacing: 1.5, marginHorizontal: 15 },
  
  // Style για το κουμπί του κωδικού (το έκανα σκούρο με χρυσά γράμματα για να ξεχωρίζει από το άλλο)
  saveBtnPassword: { backgroundColor: '#0f172a', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 5, borderWidth: 1, borderColor: '#d4af37' },
  saveBtnPasswordText: { color: '#d4af37', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.5 }
});