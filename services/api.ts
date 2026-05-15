import axios from 'axios';
import { Alert } from 'react-native';
import { router } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://face-code-pink.vercel.app';
const api = axios.create({ baseURL: API_URL, timeout: 12000 });

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      Alert.alert('Session expired', 'Please log in again.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    } else if (!err.response) {
      Alert.alert('Network Error', 'Please check your internet connection.');
    }
    return Promise.reject(err);
  }
);

export default api;