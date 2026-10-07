import { getApps, initializeApp } from 'firebase/app'
import { FacebookAuthProvider, GoogleAuthProvider, OAuthProvider, getAuth, onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut, type User } from 'firebase/auth'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}
const app = getApps()[0] ?? initializeApp(config)
export const auth = getAuth(app)
export type AuthProviderName = 'google' | 'apple' | 'facebook'
export function signIn(provider: AuthProviderName) {
  const providers = { google: new GoogleAuthProvider(), apple: new OAuthProvider('apple.com'), facebook: new FacebookAuthProvider() }
  return signInWithPopup(auth, providers[provider])
}
export const signOut = () => firebaseSignOut(auth)
export const observeAuth = (callback: (user: User | null) => void) => onAuthStateChanged(auth, callback)
export const getIdToken = async (forceRefresh = false) => {
  if (!auth.currentUser) throw new Error('Sign in is required')
  return auth.currentUser.getIdToken(forceRefresh)
}
export const deleteLocalAuthUser = async () => {
  if (!auth.currentUser) throw new Error('Sign in is required')
  await auth.currentUser.delete()
}
export type { User }
