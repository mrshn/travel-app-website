import { describe, expect, it } from 'vitest'
import { bearing, compass, decodePolyline, directionsUrl, fmtDistance, haversine, parseLatLng, travelEstimate, walkMinutes } from '../shared/utils/geo'

const colosseum = { lat: 41.8902, lng: 12.4922 }
const pantheon = { lat: 41.8986, lng: 12.4769 }
const fiumicino = { lat: 41.7999, lng: 12.2462 }

describe('geo', () => {
  it('measures distances', () => {
    const d = haversine(colosseum, pantheon)
    expect(d).toBeGreaterThan(1500)
    expect(d).toBeLessThan(1700)
  })

  it('estimates walks and switches to transit for long legs', () => {
    expect(walkMinutes(800)).toBe(13)
    expect(travelEstimate(1600)).toEqual({ mode: 'walk', minutes: 26 })
    const far = travelEstimate(haversine(pantheon, fiumicino))
    expect(far.mode).toBe('transit')
    expect(far.minutes).toBeGreaterThan(50)
  })

  it('formats distances', () => {
    expect(fmtDistance(4)).toBe('10 m')
    expect(fmtDistance(640)).toBe('640 m')
    expect(fmtDistance(1540)).toBe('1.5 km')
    expect(fmtDistance(23_400)).toBe('23 km')
  })

  it('gives a compass direction', () => {
    expect(compass(bearing(colosseum, pantheon))).toBe('NW')
    expect(compass(359)).toBe('N')
  })

  it('reads coordinates from text and map links', () => {
    expect(parseLatLng('41.9055, 12.5026')).toEqual({ lat: 41.9055, lng: 12.5026 })
    expect(parseLatLng('https://www.google.com/maps/place/X/@41.8986,12.4769,17z')).toEqual(pantheon)
    expect(parseLatLng('https://maps.google.com/?q=41.8902,12.4922')).toEqual(colosseum)
    expect(parseLatLng('Via Palestro 51')).toBeNull()
  })

  it('builds directions links', () => {
    expect(directionsUrl(pantheon, 'transit')).toBe('https://www.google.com/maps/dir/?api=1&destination=41.8986%2C12.4769&travelmode=transit')
  })
})

describe('Google polylines', () => {
  it('decodes the documented example', () => {
    // From Google's "Encoded Polyline Algorithm Format" page.
    expect(decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@')).toEqual([[38.5, -120.2], [40.7, -120.95], [43.252, -126.453]])
    expect(decodePolyline('')).toEqual([])
  })
})
