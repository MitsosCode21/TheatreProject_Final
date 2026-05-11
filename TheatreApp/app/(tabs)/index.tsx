import { router, Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// === IMPORTS ΓΙΑ ΤΟ AUTH0 OIDC ===
import { exchangeCodeAsync, makeRedirectUri, useAuthRequest, useAutoDiscovery } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

// Απαραίτητο για το web/mobile redirect
WebBrowser.maybeCompleteAuthSession();

// ΣΤΟΙΧΕΙΑ AUTH0
const AUTH0_DOMAIN = 'dev-et2jd4nbagp37sj3.eu.auth0.com';
const AUTH0_CLIENT_ID = 'p8mbRFW8zugiG9JZ54ncWGFaqLWGZHWe';

export default function AuthScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // IP Server
  const SERVER_URL = 'http://192.168.2.5:3000';

  // ========================================================
  // ΡΥΘΜΙΣΗ AUTH0 OIDC (Authorization Code + PKCE)
  // ========================================================
  const discovery = useAutoDiscovery(`https://${AUTH0_DOMAIN}`);
  
  // Το Expo θα βρει αυτόματα το σωστό URL (π.χ. exp://192.168.2.5:8081)
  const redirectUri = makeRedirectUri();

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: AUTH0_CLIENT_ID,
      scopes: ['openid', 'profile', 'email', 'offline_access'],
      redirectUri,
    },
    discovery
  );

  // ΕΛΕΓΧΟΣ ΑΠΑΝΤΗΣΗΣ ΑΠΟ AUTH0 & ΕΝΗΜΕΡΩΣΗ ΤΟΥ BACKEND ΜΑΣ
  useEffect(() => {
    const handleAuth0Response = async () => {
      if (response?.type === 'success') {
        const { code } = response.params;
        setIsLoading(true);
        try {
          // 1. Ανταλλαγή του Authorization Code με Tokens από το Auth0
          const tokenResult = await exchangeCodeAsync(
            {
              clientId: AUTH0_CLIENT_ID,
              code,
              redirectUri,
              extraParams: { code_verifier: request?.codeVerifier || '' },
            },
            discovery!
          );

          // 2. Παίρνουμε το Προφίλ Χρήστη από το Auth0 (Google)
          const userInfoRes = await fetch(`https://${AUTH0_DOMAIN}/userinfo`, {
            headers: { Authorization: `Bearer ${tokenResult.accessToken}` }
          });
          const userInfo = await userInfoRes.json();

          // 3. ΣΤΕΛΝΟΥΜΕ ΤΑ ΣΤΟΙΧΕΙΑ ΣΤΟ ΔΙΚΟ ΜΑΣ BACKEND! (ΚΡΙΣΙΜΟ)
          const backendRes = await fetch(`${SERVER_URL}/auth/external`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: userInfo.email,
              name: userInfo.name || userInfo.nickname || 'Google User',
              external_id: userInfo.sub // π.χ. google-oauth2|12345...
            })
          });

          const data = await backendRes.json();

          if (backendRes.ok) {
            // 4. Αποθηκεύουμε τα ΔΙΚΑ ΜΑΣ Tokens (από το Node.js)
            if (Platform.OS === 'web') {
              localStorage.setItem('userToken', data.token);
              if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
              localStorage.setItem('userId', data.user_id.toString());
              localStorage.setItem('userName', data.name);
            } else {
              await SecureStore.setItemAsync('userToken', data.token);
              if (data.refreshToken) await SecureStore.setItemAsync('refreshToken', data.refreshToken);
              await SecureStore.setItemAsync('userId', data.user_id.toString());
              await SecureStore.setItemAsync('userName', data.name);
            }
            router.replace('/home');
          } else {
            Alert.alert("Σφάλμα Backend", data.error || "Αποτυχία εγγραφής στη βάση.");
          }

        } catch (error) {
          console.error("Auth0 Flow Error:", error);
          Alert.alert("Σφάλμα OIDC", "Αποτυχία σύνδεσης με το Auth0.");
        } finally {
          setIsLoading(false);
        }
      } else if (response?.type === 'error') {
        Alert.alert("Σφάλμα Authentication", response.error?.message || "Αποτυχία σύνδεσης");
      }
    };

    if (response) {
      handleAuth0Response();
    }
  }, [response]);

  const handleOIDCLogin = async () => {
    if (!request) return;
    promptAsync();
  };

  // ΑΥΤΟΜΑΤΗ ΣΥΝΔΕΣΗ (Αν υπάρχει ήδη Token)
  useEffect(() => {
    const checkLoginStatus = async () => {
      const token = Platform.OS === 'web'
        ? localStorage.getItem('userToken')
        : await SecureStore.getItemAsync('userToken');

      if (token) {
        router.replace('/home');
      }
    };
    checkLoginStatus();
  }, []);

  // ========================================================
  // ΚΛΑΣΙΚΗ ΡΟΗ (Τοπική Είσοδος / Εγγραφή)
  // ========================================================
  const handleAuth = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert("Σφάλμα", "Παρακαλώ εισάγετε ένα έγκυρο email (π.χ. user@mail.com).");
      setPassword('');
      return;
    }

    if (!password || password.length < 6) {
      Alert.alert("Σφάλμα", "Ο κωδικός πρέπει να είναι τουλάχιστον 6 χαρακτήρες.");
      setPassword('');
      return;
    }

    if (!isLogin && !name) {
      Alert.alert("Σφάλμα", "Το ονοματεπώνυμο είναι απαραίτητο για την εγγραφή.");
      setPassword('');
      return;
    }

    setIsLoading(true);

    const endpoint = isLogin ? '/login' : '/register';
    const payload = isLogin ? { email, password } : { name, email, password };

    try {
      const response = await fetch(`${SERVER_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        if (isLogin && data.token) {
          if (Platform.OS === 'web') {
            localStorage.setItem('userToken', data.token);
            localStorage.setItem('refreshToken', data.refreshToken);
            localStorage.setItem('userId', data.user_id.toString());
            localStorage.setItem('userName', data.name);
          } else {
            await SecureStore.setItemAsync('userToken', data.token);
            await SecureStore.setItemAsync('refreshToken', data.refreshToken);
            await SecureStore.setItemAsync('userId', data.user_id.toString());
            await SecureStore.setItemAsync('userName', data.name);
          }

          setEmail('');
          setPassword('');
          setName('');

          router.replace('/home');
        } else {
          Alert.alert("Επιτυχία!", "Ο λογαριασμός σας δημιουργήθηκε επιτυχώς! Μπορείτε τώρα να συνδεθείτε.");
          setIsLogin(true);
          setPassword('');
        }
      } else {
        Alert.alert("Αποτυχία", data.error || "Λάθος στοιχεία. Προσπαθήστε ξανά.");
        setPassword('');
      }
    } catch (error) {
      Alert.alert("Σφάλμα Δικτύου", "Αδυναμία σύνδεσης με τον Server.");
      setPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setPassword('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.logo}>🎭</Text>
          <Text style={styles.title}>{isLogin ? 'Θεατρικές Κρατήσεις' : 'Νέο Μέλος'}</Text>
          <Text style={styles.subtitle}>
            {isLogin ? 'Συνδεθείτε για να δείτε τις παραστάσεις' : 'Δημιουργήστε λογαριασμό για να κλείσετε θέσεις'}
          </Text>

          {!isLogin && (
            <TextInput
              style={styles.input} placeholder="Ονοματεπώνυμο" placeholderTextColor="#94a3b8"
              value={name} onChangeText={setName} editable={!isLoading}
            />
          )}

          <TextInput
            style={styles.input} placeholder="Email" placeholderTextColor="#94a3b8"
            value={email} onChangeText={setEmail} keyboardType="email-address"
            autoCapitalize="none" editable={!isLoading}
          />
          <TextInput
            style={styles.input} placeholder="Κωδικός" placeholderTextColor="#94a3b8"
            value={password} onChangeText={setPassword} secureTextEntry editable={!isLoading}
          />

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleAuth}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#0f172a" />
            ) : (
              <Text style={styles.buttonText}>{isLogin ? 'Είσοδος' : 'Εγγραφή'}</Text>
            )}
          </TouchableOpacity>

          {/* ===== ΚΟΥΜΠΙ OIDC/PKCE (Μόνο στο Login) ===== */}
          {isLogin && (
            <TouchableOpacity
              style={styles.oidcLink}
              onPress={handleOIDCLogin}
              disabled={isLoading || !request}
            >
              <Text style={styles.oidcLinkText}>🇬 Σύνδεση με Google (Auth0)</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.switchButton}
            onPress={toggleMode}
            disabled={isLoading}
          >
            <Text style={styles.switchText}>
              {isLogin ? 'Δεν έχετε λογαριασμό; Εγγραφείτε εδώ' : 'Έχετε ήδη λογαριασμό; Επιστροφή στην είσοδο'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: '#0f172a',
    padding: 30,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10
  },
  logo: { fontSize: 60, textAlign: 'center', marginBottom: 15 },
  title: { fontSize: 26, fontWeight: '900', textAlign: 'center', color: '#f8fafc', marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: 'center', color: '#94a3b8', marginBottom: 30, lineHeight: 20 },
  input: {
    backgroundColor: '#1e293b',
    color: '#fff',
    padding: 16,
    borderRadius: 14,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155'
  },
  button: {
    backgroundColor: '#d4af37',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#d4af37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#020617', fontSize: 17, fontWeight: 'bold', textTransform: 'uppercase' },
  oidcLink: {
    marginTop: 15,
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: '#f8fafc', 
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1'
  },
  oidcLinkText: { color: '#0f172a', fontSize: 16, fontWeight: 'bold' },
  switchButton: { marginTop: 25, alignItems: 'center' },
  switchText: { color: '#d4af37', fontSize: 14, fontWeight: '600' }
});