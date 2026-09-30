// Firebase, loaded on demand (kept out of the first screen's download).
import { initializeApp } from 'firebase/app'
import {
  GoogleAuthProvider, browserLocalPersistence, browserPopupRedirectResolver, connectAuthEmulator, getRedirectResult,
  indexedDBLocalPersistence, initializeAuth, onAuthStateChanged, signInWithCredential, signInWithPopup, signInWithRedirect, signOut,
  type User,
} from 'firebase/auth'
import {
  collection, connectFirestoreEmulator, doc, getDocs, getFirestore, onSnapshot, runTransaction, setDoc,
} from 'firebase/firestore'
import { connectStorageEmulator, deleteObject, getBlob, getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage'
import type { CloudItem } from '#shared/utils/sync'

export interface FirebaseConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

export type { User }

/** `emulators`: a host running the Firebase emulators (tests only). */
export function createFirebase(config: FirebaseConfig, emulators = '') {
  // Emulators run as a "demo-" project, which needs no Google credentials at all.
  const app = initializeApp(emulators ? { ...config, projectId: 'demo-travels', storageBucket: 'demo-travels.appspot.com' } : config)
  const auth = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    popupRedirectResolver: browserPopupRedirectResolver,
  })
  // No offline cache here: the app keeps its own copy on the device and only syncs when online.
  const db = getFirestore(app)
  const storage = getStorage(app)
  if (emulators) {
    connectAuthEmulator(auth, `http://${emulators}:9099`, { disableWarnings: true })
    connectFirestoreEmulator(db, emulators, 8080)
    connectStorageEmulator(storage, emulators, 9199)
  }
  const provider = new GoogleAuthProvider()
  /** Google's account list, with `hint` (an email: the account this device remembers) picked out when there is one. */
  const google = (hint?: string) => {
    provider.setCustomParameters(hint ? { prompt: 'select_account', login_hint: hint } : { prompt: 'select_account' })
    return provider
  }

  // Each Google account has its own trips, progress and photos, readable and writable by that account only
  // (firebase/firestore.rules and storage.rules).
  const items = (uid: string) => collection(db, 'users', uid, 'items')
  const photoRef = (uid: string, id: string) => ref(storage, `users/${uid}/photos/${id}.jpg`)

  return {
    auth,
    onUser: (fn: (u: User | null) => void) => onAuthStateChanged(auth, fn),
    redirectResult: () => getRedirectResult(auth),
    signInRedirect: (hint?: string) => signInWithRedirect(auth, google(hint)),
    /** Opens Google's sign-in window: call it straight from the tap, with nothing awaited before it. */
    signInPopup: (hint?: string) => signInWithPopup(auth, google(hint)),
    signOut: () => signOut(auth),

    watchItems(uid: string, fn: (items: Map<string, CloudItem>, meta: { fromCache: boolean }) => void, onError: (e: unknown) => void) {
      return onSnapshot(items(uid), { includeMetadataChanges: true }, (snap) => {
        fn(new Map(snap.docs.map(d => [d.id, d.data() as CloudItem])), { fromCache: snap.metadata.fromCache })
      }, onError)
    },

    /**
     * Writes the item only if the cloud still has the version this device based it on
     * (`basis`: its updatedAt, or null for "not there yet"). False when another device got there first.
     */
    writeItemIf(uid: string, id: string, item: CloudItem, basis: number | null): Promise<boolean> {
      const r = doc(items(uid), id)
      return runTransaction(db, async (tx) => {
        const snap = await tx.get(r)
        const current = snap.exists() ? (snap.data() as CloudItem).updatedAt : null
        if (current !== basis) return false
        tx.set(r, item)
        return true
      })
    },

    uploadPhoto: (uid: string, id: string, blob: Blob) => uploadBytes(photoRef(uid, id), blob, { contentType: blob.type || 'image/jpeg' }),
    async downloadPhoto(uid: string, id: string): Promise<Blob | string | null> {
      try {
        return await getBlob(photoRef(uid, id))
      }
      catch (e) {
        // Without CORS on the bucket a blob can't be read, but the image can still be shown by URL.
        if ((e as { code?: string }).code === 'storage/object-not-found') return null
        try {
          return await getDownloadURL(photoRef(uid, id))
        }
        catch {
          return null
        }
      }
    },
    deletePhoto: (uid: string, id: string) => deleteObject(photoRef(uid, id)).catch(() => {}),

    /** Tests only: the Auth emulator accepts a made-up Google account. */
    testSignIn(sub: string, email: string) {
      if (!emulators) throw new Error('emulators only')
      return signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub, email, email_verified: true })))
    },
    /** Tests only: reads an account's item ids directly (for another account, the rules should refuse). */
    async peek(uid: string): Promise<string[]> {
      if (!emulators) throw new Error('emulators only')
      return (await getDocs(items(uid))).docs.map(d => d.id)
    },
    /** Tests only: writes a well-formed item into an account's items (for another account, the rules should refuse). */
    poke(uid: string) {
      if (!emulators) throw new Error('emulators only')
      return setDoc(doc(items(uid), 'trip-poke'), { kind: 'trip', ref: 'poke', json: '{}', updatedAt: Date.now() })
    },
  }
}

export type Firebase = ReturnType<typeof createFirebase>
