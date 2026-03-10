import { create } from 'zustand';

interface VideoStore {
  isActive: boolean;
  bvid: string;
  title: string;
  cover: string;
  setVideo: (bvid: string, title: string, cover: string) => void;
  clearVideo: () => void;
}

export const useVideoStore = create<VideoStore>(set => ({
  isActive: false,
  bvid: '',
  title: '',
  cover: '',
  setVideo: (bvid, title, cover) => set({ isActive: true, bvid, title, cover }),
  clearVideo: () => set({ isActive: false }),
}));
