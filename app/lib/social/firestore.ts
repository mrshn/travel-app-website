// The Firestore backend of the social layer (package P1 of docs/design/2026-10-14-together.md). Placeholder until P1.
import type { PersonRef } from '#shared/types/social'
import type { Firebase } from '~/lib/firebase'
import { SocialError, type SocialBackend } from './api'

export function createFirestoreBackend(_fb: Firebase, _me: PersonRef | null): SocialBackend {
  throw new SocialError('unknown', 'The cloud backend isn’t built yet.')
}
