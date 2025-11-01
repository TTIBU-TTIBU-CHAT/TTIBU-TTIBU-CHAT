import { create } from 'zustand'

export const useSidebarStore = create((set) => ({
  isCollapsed: true,
  toggleSidebar: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
}))
