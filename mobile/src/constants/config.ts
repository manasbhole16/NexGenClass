import { Platform } from 'react-native';

// Auto-detect Android emulator vs iOS simulator host
const getDefaultApiUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }
  return 'http://localhost:3000';
};

export const API_BASE_URL = getDefaultApiUrl();
export const SOCKET_URL = getDefaultApiUrl();

export const APP_SCHEME = 'nexgenclass';
