import axios from 'axios';
import { Alert } from 'react-native';
import * as Linking from 'expo-linking';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://face-code-pink.vercel.app';
const api = axios.create({ baseURL: API_URL, timeout: 12000 });

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      Alert.alert('Session expired', 'Please log in again.', [
        { text: 'OK', onPress: () => Linking.openURL('/login') },
      ]);
    } else if (!err.response) {
      Alert.alert('Network Error', 'Please check your internet connection.');
    }
    return Promise.reject(err);
  }
);

export default api;