// Firebase, loaded on demand (kept out of the first screen's download).
import { initializeApp } from 'firebase/app'
import {
  GoogleAuthProvider, browserLocalPersistence, browserPopupRedirectResolver, connectAuthEmulator, getRedirectResult,
  indexedDBLocalPersistence, initializeAuth, onAuthStateChanged, signInWithCredential, signInWithPopup, signInWithRedirect, signOut,
  type User,
} from 'firebase/auth'
import {
  collection, connectFirestoreEmulator, doc, getDoc, getDocs, getFirestore, onSnapshot, runTransaction, setDoc,
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
  const app = initializeApp(config)
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
  provider.setCustomParameters({ prompt: 'select_account' })

  const items = (uid: string) => collection(db, 'users', uid, 'items')
  const photoRef = (uid: string, id: string) => ref(storage, `users/${uid}/photos/${id}.jpg`)

  return {
    auth,
    onUser: (fn: (u: User | null) => void) => onAuthStateChanged(auth, fn),
    redirectResult: () => getRedirectResult(auth),
    signInRedirect: () => signInWithRedirect(auth, provider),
    signInPopup: () => signInWithPopup(auth, provider),
    signOut: () => signOut(auth),

    /** Claims the app for the first account that signs in; false if it belongs to someone else. */
    async claim(uid: string): Promise<boolean> {
      const owner = doc(db, 'meta', 'owner')
      const snap = await getDoc(owner)
      if (!snap.exists()) {
        await setDoc(owner, { uid, claimedAt: Date.now() })
        return true
      }
      return (snap.data() as { uid?: string }).uid === uid
    },

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
    /** Tests only: reads another account's items directly (the rules should refuse). */
    async peek(uid: string) {
      if (!emulators) throw new Error('emulators only')
      return (await getDocs(items(uid))).size
    },
  }
}

export type Firebase = ReturnType<typeof createFirebase>
