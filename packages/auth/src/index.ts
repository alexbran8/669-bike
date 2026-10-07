import { getApps, initializeApp } from 'firebase/app'
import { GoogleAuthProvider, getAuth, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut as firebaseSignOut, type User } from 'firebase/auth'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  // In production Netlify proxies /__/auth/* to Firebase, keeping OAuth state
  // on the application's origin for Safari's storage partitioning rules.
  authDomain: import.meta.env.PROD && typeof window !== 'undefined'
    ? window.location.host
    : import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}
const app = getApps()[0] ?? initializeApp(config)
export const auth = getAuth(app)
export type AuthProviderName = 'google'
export function signIn(provider: AuthProviderName) {
  const providers = {
    google: new GoogleAuthProvider(),
    // Re-enable when provider credentials and OAuth callbacks are configured:
    // apple: new OAuthProvider('apple.com'),
    // facebook: new FacebookAuthProvider(),
  }
  const mobileBrowser = typeof navigator !== 'undefined' && (/Android|iPad|iPhone|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
  if (mobileBrowser) return signInWithRedirect(auth, providers[provider])
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
