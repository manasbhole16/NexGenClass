import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'nexgen_auth_token';
const USER_KEY = 'nexgen_user_profile';

// Memory fallback for web testing or unsupported environments
const memoryStorage: Record<string, string> = {};

export const storageService = {
  async setToken(token: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        memoryStorage[TOKEN_KEY] = token;
      } else {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
      }
    } catch {
      memoryStorage[TOKEN_KEY] = token;
    }
  },

  async getToken(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return memoryStorage[TOKEN_KEY] || null;
      }
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return memoryStorage[TOKEN_KEY] || null;
    }
  },

  async removeToken(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        delete memoryStorage[TOKEN_KEY];
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
    } catch {
      delete memoryStorage[TOKEN_KEY];
    }
  },

  async setUser(user: any): Promise<void> {
    const val = JSON.stringify(user);
    try {
      if (Platform.OS === 'web') {
        memoryStorage[USER_KEY] = val;
      } else {
        await SecureStore.setItemAsync(USER_KEY, val);
      }
    } catch {
      memoryStorage[USER_KEY] = val;
    }
  },

  async getUser(): Promise<any | null> {
    try {
      let val = null;
      if (Platform.OS === 'web') {
        val = memoryStorage[USER_KEY] || null;
      } else {
        val = await SecureStore.getItemAsync(USER_KEY);
      }
      return val ? JSON.parse(val) : null;
    } catch {
      return null;
    }
  },

  async clearAuth(): Promise<void> {
    await this.removeToken();
    try {
      if (Platform.OS === 'web') {
        delete memoryStorage[USER_KEY];
      } else {
        await SecureStore.deleteItemAsync(USER_KEY);
      }
    } catch {
      delete memoryStorage[USER_KEY];
    }
  }
};
