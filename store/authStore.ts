import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserInfo } from '../services/bilibili';

interface AuthState {
  sessdata: string | null;
  uid: string | null;
  username: string | null;
  face: string | null;
  isLoggedIn: boolean;
  login: (sessdata: string, uid: string, username?: string) => Promise<void>;
  logout: () => Promise<void>;
  restore: () => Promise<void>;
  setProfile: (face: string, username: string, uid: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  sessdata: null,
  uid: null,
  username: null,
  face: null,
  isLoggedIn: false,

  login: async (sessdata, uid, username) => {
    await AsyncStorage.multiSet([
      ['SESSDATA', sessdata],
      ['UID', uid],
      ['USERNAME', username ?? ''],
    ]);
    set({ sessdata, uid, username: username ?? null, isLoggedIn: true });
  },

  logout: async () => {
    await AsyncStorage.multiRemove(['SESSDATA', 'UID', 'USERNAME', 'FACE']);
    set({ sessdata: null, uid: null, username: null, face: null, isLoggedIn: false });
  },

  restore: async () => {
    const sessdata = await AsyncStorage.getItem('SESSDATA');
    if (sessdata) {
      set({ sessdata, isLoggedIn: true });
      try {
        const info = await getUserInfo();
        await AsyncStorage.setItem('FACE', info.face);
        set({ face: info.face, username: info.uname, uid: String(info.mid) });
      } catch {}
    }
  },

  setProfile: (face, username, uid) => set({ face, username, uid }),
}));
