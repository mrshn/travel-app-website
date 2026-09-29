// Trips that ship with the app. To add one: create app/data/<trip>.ts exporting a Trip
// (see shared/types/trip.ts and rome.ts) and add it to this list.
// Pushing a newer version of a trip here updates it in the app on every device:
// silently if it wasn't changed there, otherwise the app offers the update.
import type { Trip } from '#shared/types/trip'
import { romeTrip } from './rome'

export const SEED_TRIPS: Trip[] = [romeTrip]
