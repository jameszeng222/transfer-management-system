import { create } from 'zustand';

interface AppState {
  currentPageName: string;
  setCurrentPageName: (name: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentPageName: '数据看板',
  setCurrentPageName: (name) => set({ currentPageName: name }),
}));
