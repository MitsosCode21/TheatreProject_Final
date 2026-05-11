import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SERVER_URL = 'http://192.168.2.5:3000';

export const fetchWithAuth = async (url, options = {}) => {
  let token = Platform.OS === 'web' ? localStorage.getItem('userToken') : await SecureStore.getItemAsync('userToken');

  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  let response = await fetch(url, { ...options, headers });

  // Αν το token έληξε (403), κάνουμε Rotation
  if (response.status === 403) {
    const refreshToken = Platform.OS === 'web' ? localStorage.getItem('refreshToken') : await SecureStore.getItemAsync('refreshToken');
    
    if (refreshToken) {
      const refreshRes = await fetch(`${SERVER_URL}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        
        // SOS: Αποθηκεύουμε το ΝΕΟ Access Token ΚΑΙ το ΝΕΟ Refresh Token (Rotation)
        if (Platform.OS === 'web') {
          localStorage.setItem('userToken', refreshData.token);
          localStorage.setItem('refreshToken', refreshData.refreshToken);
        } else {
          await SecureStore.setItemAsync('userToken', refreshData.token);
          await SecureStore.setItemAsync('refreshToken', refreshData.refreshToken);
        }

        // Ξαναδοκιμάζουμε την αρχική κλήση με το νέο token
        headers['Authorization'] = `Bearer ${refreshData.token}`;
        response = await fetch(url, { ...options, headers });
      }
    }
  }
  return response;
};