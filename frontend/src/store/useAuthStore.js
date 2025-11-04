import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

export const useAuthStore = create(
  subscribeWithSelector((set) => ({
    token: null,
    user: null,
    isAuthed: false,

    signIn: async ({ token, user }) => set({ token, user, isAuthed: true }),
    signOut: () => set({ token: null, user: null, isAuthed: false }),
  }))
)

export const authSnapshot = () => useAuthStore.getState()
