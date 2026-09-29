// Generated from the Rome research plan (September 2026). Edit freely: the app copies it into your browser on first run.
import type { Trip } from '#shared/types/trip'

export const romeTrip: Trip = {
 "id": "rome-2026-10",
 "seedId": "rome-2026-10",
 "title": "Rome",
 "destination": "Rome",
 "country": "Italy",
 "timezone": "Europe/Rome",
 "start": "2026-10-08",
 "end": "2026-10-12",
 "subtitle": "First trip abroad · solo · YellowSquare",
 "cover": {
  "scene": "skyline",
  "tod": "sunset"
 },
 "currency": "EUR",
 "fx": {
  "homeCurrency": "TRY",
  "rate": 55.8,
  "source": "ECB, 25 Sep 2026"
 },
 "home": {
  "label": "YellowSquare",
  "name": "YellowSquare Rome",
  "address": "Via Palestro 51, 00185 Roma",
  "lat": 41.9055,
  "lng": 12.5026,
  "query": "YellowSquare Rome, Via Palestro 51, Rome"
 },
 "airport": {
  "name": "Fiumicino (FCO)",
  "lat": 41.7999,
  "lng": 12.2462,
  "label": "Fiumicino · 32 min"
 },
 "days": [
  {
   "id": "thu",
   "date": "2026-10-08",
   "num": "VIII",
   "label": "Arrival",
   "title": "Barcelona to your bed in Rome",
   "cover": {
    "scene": "plane",
    "tod": "night"
   },
   "facts": [
    {
     "icon": "plane",
     "text": "Wizz Air · BCN 21:45 → FCO ~23:40"
    },
    {
     "icon": "metro",
     "text": "Rome metro closes 23:30 tonight"
    },
    {
     "icon": "bed",
     "text": "Bed held until 04:00"
    }
   ],
   "stops": [
    {
     "id": "eat-dinner-in-barcelona",
     "start": 900,
     "timeLabel": "Before 18:30",
     "kind": "food",
     "icon": "food",
     "title": "Eat dinner in Barcelona",
     "end": 1065,
     "tip": "Rome's food hall at Termini closes at 23:30, before you land.",
     "minor": true
    },
    {
     "id": "online-check-in-done-boarding-pass-printed",
     "start": 1065,
     "timeLabel": "Before 18:45",
     "kind": "task",
     "icon": "task",
     "title": "Online check-in done, boarding pass printed",
     "tip": "Wizz check-in opened at 21:45 on Wed 7 Oct and closes at 18:45 today; after that the desk charges €40–50. Print the pass: the desk must stamp it, and a phone pass may not be stampable.",
     "cost": "Free",
     "tags": [
      "must"
     ],
     "links": [
      {
       "label": "Wizz check-in",
       "url": "https://www.wizzair.com/en-gb/help-centre/check-in-and-boarding/check-in/check-in-process"
      }
     ],
     "minor": true
    },
    {
     "id": "aerobus-a2-to-terminal-2",
     "start": 1110,
     "timeLabel": "18:30",
     "kind": "move",
     "icon": "bus",
     "title": "Aerobús A2 to Terminal 2",
     "end": 1155,
     "tip": "From Plaça de Catalunya, 25–35 min; take the A2, not the A1, and pay the driver by card. Or the R2 Nord train from Sants (~19 min) or Passeig de Gràcia (~26 min), every 30 min, straight into T2: take one train earlier than you need.",
     "cost": "€7.45",
     "minor": true
    },
    {
     "id": "arrive-at-barcelona-terminal-2",
     "start": 1155,
     "timeLabel": "19:15–19:30",
     "kind": "move",
     "icon": "flight",
     "title": "Arrive at Barcelona Terminal 2",
     "tip": "At Terminal 1 by mistake? A free shuttle runs every 4–7 min.",
     "minor": true
    },
    {
     "id": "wizz-desk-document-check-and-boarding-pass-stamp",
     "start": 1185,
     "timeLabel": "19:45–21:05",
     "kind": "task",
     "icon": "task",
     "title": "Wizz desk: document check and boarding-pass stamp",
     "end": 1265,
     "tip": "Required for non-EU passports even after online check-in. Desks close about 21:05. The desk area can be barely marked, so ask staff. Skipping it can mean no boarding.",
     "cost": "Free",
     "tags": [
      "must"
     ],
     "minor": true
    },
    {
     "id": "security",
     "start": 1265,
     "timeLabel": "Then",
     "kind": "task",
     "icon": "shield",
     "title": "Security",
     "tip": "Plan on the 100 ml rule (new scanners are confirmed only at T1): liquids in one clear 1-litre bag. One power bank, max 100 Wh, in your under-seat bag, never used in flight.",
     "minor": true
    },
    {
     "id": "gate-closes",
     "start": 1275,
     "timeLabel": "21:15",
     "kind": "move",
     "icon": "flight",
     "title": "Gate closes",
     "tip": "Show your boarding pass and passport.",
     "minor": true
    },
    {
     "id": "fly-to-rome-fiumicino-fco-land-23-40",
     "start": 1305,
     "timeLabel": "21:45",
     "kind": "move",
     "icon": "flight",
     "title": "Fly to Rome Fiumicino (FCO), land ~23:40",
     "end": 1420,
     "tip": "You may arrive at Terminal 1 or 3 (sources disagree). Follow “Uscita / Exit”.",
     "scene": "plane"
    },
    {
     "id": "possible-police-document-check",
     "start": 1425,
     "timeLabel": "~23:45",
     "kind": "task",
     "icon": "shield",
     "title": "Possible police document check",
     "tip": "Since 1 Aug 2026 Italy has run targeted checks on non-EU travellers arriving from Spain, renewed every 15 days (last confirmed to 1 Oct). Walk off the plane with your folder in hand. If stopped: “Tourist, four days, YellowSquare hostel, I fly home Monday with Pegasus.” Allow 10–30 minutes.",
     "tags": [
      "must"
     ],
     "minor": true
    },
    {
     "id": "pick-ride",
     "start": 1430,
     "timeLabel": "~23:50",
     "kind": "move",
     "icon": "taxi",
     "title": "Pick your ride into Rome",
     "end": 1485,
     "options": {
      "label": "Pick your ride into Rome",
      "default": "sit",
      "helper": "Out by 23:40 with no check: take the train. Otherwise: the SIT bus. Exhausted or nervous: the €55 taxi to the door.",
      "note": "Late backups: Rome Airport Bus 23:55 from T3 (€7 online, €9 at the airport) to Via Giolitti · Cotral night bus 01:45 from T1 (€5, €7 on board).",
      "choices": [
       {
        "id": "train",
        "label": "Train 23:53",
        "title": "Leonardo Express, 23:53 (last train)",
        "lines": [
         "Only if you're in arrivals by about 23:40 and weren't stopped for a check.",
         "32 min to Termini (arrives about 00:25), then about 10 min on foot to the hostel.",
         "Buy only when you're sure you'll make it (machine or Trenitalia app) and validate a paper ticket; the fine is €50+.",
         "Some sites say 23:23 or 23:27. The official timetable says 23:53."
        ],
        "place": {
         "name": "Leonardo Express, 23:53 (last train)",
         "lat": 41.901,
         "lng": 12.5018,
         "query": "Leonardo Express, 23:53 (last train), Rome"
        },
        "kind": "move",
        "icon": "train",
        "cost": "€14",
        "via": "ride",
        "scene": "train",
        "links": [
         {
          "label": "Timetable",
          "url": "https://www.trenitalia.com/content/dam/trenitalia/allegati/info/orario-digitale/collegamenti/orari-leonardo-express.pdf"
         }
        ]
       },
       {
        "id": "sit",
        "label": "SIT bus",
        "title": "SIT Bus Shuttle from Terminal 3, stand 16",
        "lines": [
         "Leaves 23:50 · 00:15 · 00:40 · 01:15.",
         "Arrives Termini, Via Marsala 5 (about 00:40 · 01:05 · 01:25 · 02:00), about 5 min on foot from YellowSquare.",
         "The one-way price isn't published; tickets cost €2 more at the stop.",
         "Landed at Terminal 1? Walk through arrivals to Terminal 3."
        ],
        "place": {
         "name": "SIT Bus Shuttle from Terminal 3, stand 16",
         "lat": 41.902,
         "lng": 12.5031,
         "query": "SIT Bus Shuttle from Terminal 3, stand 16, Rome"
        },
        "kind": "move",
        "icon": "bus",
        "cost": "Buy online",
        "badge": "Budget pick",
        "via": "ride",
        "scene": "bus",
        "links": [
         {
          "label": "SIT timetable",
          "url": "https://www.sitbusshuttle.com/fermate-e-orari/orari-fiumicino-roma/"
         }
        ]
       },
       {
        "id": "taxi",
        "label": "Taxi €55",
        "title": "Official white taxi, €55 fixed",
        "lines": [
         "Rank in front of Terminals 1 and 3. White car, TAXI roof sign, Roma Capitale crest and licence number.",
         "The €55 fixed fare covers anywhere inside the Aurelian Walls, extras included.",
         "Ask before you get in: “Tariffa fissa, cinquantacinque euro?”",
         "Say no to anyone offering a “taxi” or “transfer” inside the arrivals hall, and to Fiumicino-licensed taxis, which charge €80."
        ],
        "place": {
         "name": "Official white taxi, €55 fixed",
         "lat": 41.9055,
         "lng": 12.5026,
         "query": "Official white taxi, €55 fixed, Rome"
        },
        "kind": "move",
        "icon": "taxi",
        "cost": "€55",
        "badge": "Door to door",
        "via": "ride",
        "scene": "taxi",
        "links": [
         {
          "label": "Official fares",
          "url": "https://romamobilita.it/muoversi-a-roma/taxi/"
         }
        ]
       }
      ]
     }
    },
    {
     "id": "check-in-at-yellowsquare-via-palestro-51",
     "start": 1485,
     "timeLabel": "00:45–01:15",
     "kind": "rest",
     "icon": "bed",
     "title": "Check in at YellowSquare, Via Palestro 51",
     "end": 1560,
     "tip": "Show your passport and sign the registration: that's your “dichiarazione di presenza”. Pay the city tax (€3.50 × 4 nights), lock your valuables, sleep. Walk on the Via Marsala side of Termini; don't linger around Piazza dei Cinquecento or the Via Giolitti side at night.",
     "cost": "€14 city tax",
     "bookingId": "hostel",
     "scene": "hostel",
     "links": [
      {
       "label": "YellowSquare FAQ",
       "url": "https://yellowsquare.com/faqs/"
      }
     ]
    }
   ],
   "alerts": [
    {
     "from": 1020,
     "to": 1066,
     "icon": "alert",
     "text": "Wizz online check-in closes at 18:45. After that the airport desk charges €40–50.",
     "tone": "warn"
    },
    {
     "from": 1185,
     "to": 1265,
     "icon": "check",
     "text": "Non-EU passport: get your boarding pass stamped at the Wizz desk before about 21:05.",
     "tone": "warn"
    },
    {
     "from": 1390,
     "to": 1440,
     "icon": "shield",
     "text": "Have passport, hostel booking, Pegasus ticket and insurance in your hand for a possible police check."
    },
    {
     "from": 1415,
     "to": 1434,
     "icon": "train",
     "text": "The last Leonardo Express to Termini leaves at 23:53.",
     "tone": "warn"
    }
   ],
   "journey": {
    "title": "Your journey",
    "nodes": [
     {
      "time": "18:30",
      "name": "Plaça de Catalunya",
      "sub": "Aerobús A2 to T2",
      "mode": ""
     },
     {
      "time": "19:15",
      "name": "Barcelona T2",
      "sub": "Wizz desk stamp, security",
      "mode": ""
     },
     {
      "time": "~23:40",
      "name": "Rome Fiumicino",
      "sub": "possible police check",
      "mode": "fly",
      "label": "Wizz Air 21:45"
     },
     {
      "time": "~00:25",
      "name": "Termini",
      "sub": "train, SIT bus or taxi",
      "mode": "ride"
     },
     {
      "time": "~00:45",
      "name": "YellowSquare",
      "sub": "Via Palestro 51",
      "mode": "walk"
     }
    ]
   },
   "nearby": {
    "cards": [
     {
      "title": "Walk off the plane with",
      "icon": "doc",
      "items": [
       {
        "icon": "doc",
        "text": "Passport with visa"
       },
       {
        "icon": "bed",
        "text": "Hostel booking (YellowSquare, from Thu 8 Oct)"
       },
       {
        "icon": "plane",
        "text": "Pegasus e-ticket for Mon 12 Oct"
       },
       {
        "icon": "shield",
        "text": "Travel insurance with its 24/7 number"
       },
       {
        "icon": "euro",
        "text": "Cards plus some cash"
       }
      ]
     },
     {
      "title": "At night near Termini",
      "icon": "shield",
      "items": [
       {
        "icon": "check",
        "text": "The Via Marsala side (north-east, towards the hostel) is your side."
       },
       {
        "icon": "alert",
        "text": "Don't hang around Piazza dei Cinquecento or the Via Giolitti / Esquilino side, a police red zone."
       },
       {
        "icon": "taxi",
        "text": "Ended up on the far side? Take a taxi from the Termini rank."
       }
      ]
     }
    ]
   }
  },
  {
   "id": "fri",
   "date": "2026-10-09",
   "num": "IX",
   "label": "Vatican",
   "title": "Vatican and the historic centre",
   "cover": {
    "scene": "stpeters",
    "tod": "day"
   },
   "facts": [
    {
     "icon": "sun",
     "text": "Sunrise 07:15"
    },
    {
     "icon": "sunset",
     "text": "Sunset 18:38"
    },
    {
     "icon": "moon",
     "text": "Blue hour 18:56–19:17"
    },
    {
     "icon": "metro",
     "text": "Last metro ~01:30"
    },
    {
     "icon": "shirt",
     "text": "Long trousers, covered shoulders"
    }
   ],
   "stops": [
    {
     "id": "metro-a-termini-ottaviano",
     "start": 435,
     "timeLabel": "07:15",
     "kind": "move",
     "icon": "metro",
     "title": "Metro A, Termini → Ottaviano",
     "tip": "Bag in front: Metro A is a pickpocket hotspot.",
     "cost": "€1.50 tap",
     "place": {
      "name": "Metro A, Termini → Ottaviano",
      "lat": 41.9095,
      "lng": 12.4581,
      "query": "Metro A, Termini → Ottaviano, Rome"
     },
     "via": {
      "line": "A",
      "from": "Termini",
      "to": "Ottaviano"
     },
     "minor": true,
     "metro": [
      "A"
     ]
    },
    {
     "id": "vatican-museums-sistine-chapel",
     "start": 480,
     "timeLabel": "08:00–11:00",
     "kind": "sight",
     "icon": "sight",
     "title": "Vatican Museums + Sistine Chapel",
     "end": 660,
     "tip": "08:00 is the quietest slot. No photos or video in the Sistine Chapel; no flash, tripods or selfie sticks anywhere. Shoot the Gallery of Maps and the Momo spiral staircase at the exit (that's the one drawn here).",
     "cost": "€25",
     "bookingId": "vatican",
     "tags": [
      "must"
     ],
     "place": {
      "name": "Vatican Museums + Sistine Chapel",
      "lat": 41.9066,
      "lng": 12.4536,
      "query": "Vatican Museums, Viale Vaticano, Rome"
     },
     "scene": "spiral",
     "links": [
      {
       "label": "Tickets",
       "url": "https://tickets.museivaticani.va"
      }
     ]
    },
    {
     "id": "early-lunch-at-bonci-pizzarium",
     "start": 675,
     "timeLabel": "~11:15",
     "kind": "food",
     "icon": "food",
     "title": "Early lunch at Bonci Pizzarium",
     "end": 730,
     "tip": "Via della Meloria 43. Pizza al taglio sold by weight (€15–45/kg). Opens 11:00 on Fridays; walk in.",
     "cost": "~€10–15",
     "place": {
      "name": "Early lunch at Bonci Pizzarium",
      "lat": 41.9068,
      "lng": 12.4466,
      "query": "Pizzarium Bonci, Via della Meloria 43, Rome"
     },
     "scene": "taglio"
    },
    {
     "id": "st-peter-s-basilica-the-free-grottoes",
     "start": 735,
     "timeLabel": "~12:15",
     "kind": "sight",
     "icon": "sight",
     "title": "St Peter's Basilica + the free Grottoes",
     "end": 810,
     "tip": "Security in the square first: 15–60 min. No bag storage. Long trousers and covered shoulders.",
     "cost": "Free",
     "place": {
      "name": "St Peter's Basilica + the free Grottoes",
      "lat": 41.9022,
      "lng": 12.4539,
      "query": "St. Peter's Basilica, Vatican City"
     },
     "scene": "stpeters",
     "links": [
      {
       "label": "Visitor FAQ",
       "url": "https://www.basilicasanpietro.va/en/help/the-basilica"
      }
     ]
    },
    {
     "id": "climb-the-dome",
     "start": 810,
     "timeLabel": "~13:30",
     "kind": "sight",
     "icon": "sight",
     "title": "Climb the dome",
     "end": 885,
     "tip": "Kiosk €10 stairs / €15 lift (few slots), or online €17 / €22 with basilica entry within an hour of your dome time. 551 steps, or 320 with the lift. Last entry about 16:30. The entrance is on the right, before the basilica steps.",
     "cost": "€10–22",
     "tags": [
      "skipIfTired"
     ],
     "links": [
      {
       "label": "Online dome tickets",
       "url": "https://booking.basilicasanpietro.va/en/idea/52251275/-dome-with-stairs-includes-basilica-"
      }
     ],
     "minor": true
    },
    {
     "id": "castel-sant-angelo-the-angel-s-terrace",
     "start": 900,
     "timeLabel": "~15:00",
     "kind": "sight",
     "icon": "sight",
     "title": "Castel Sant'Angelo + the Angel's Terrace",
     "end": 980,
     "tip": "Tue–Sun 09:00–19:30; booking recommended.",
     "cost": "€18",
     "tags": [
      "skipIfTired"
     ],
     "place": {
      "name": "Castel Sant'Angelo + the Angel's Terrace",
      "lat": 41.9031,
      "lng": 12.4663,
      "query": "Castel Sant'Angelo, Rome"
     },
     "scene": "castel",
     "links": [
      {
       "label": "Official",
       "url": "https://direzionemuseiroma.cultura.gov.it/en/museo-nazionale-di-castel-santangelo/"
      }
     ]
    },
    {
     "id": "ponte-sant-angelo-via-dei-coronari-piazza-navona",
     "start": 990,
     "timeLabel": "~16:30",
     "kind": "move",
     "icon": "walk",
     "title": "Ponte Sant'Angelo → Via dei Coronari → Piazza Navona",
     "end": 1035,
     "cost": "Free",
     "place": {
      "name": "Ponte Sant'Angelo → Via dei Coronari → Piazza Navona",
      "lat": 41.8992,
      "lng": 12.4731,
      "query": "Piazza Navona, Rome"
     },
     "scene": "navona"
    },
    {
     "id": "pantheon",
     "start": 1035,
     "timeLabel": "~17:15",
     "kind": "sight",
     "icon": "sight",
     "title": "Pantheon",
     "end": 1062,
     "tip": "€7 since 1 Jul 2026; book a timed slot on Musei Italiani. Open to 19:00, last entry 18:30. Or go on Monday at 09:00.",
     "cost": "€7",
     "bookingId": "pantheon",
     "place": {
      "name": "Pantheon",
      "lat": 41.8986,
      "lng": 12.4769,
      "query": "Pantheon, Rome"
     },
     "scene": "pantheon",
     "links": [
      {
       "label": "Tickets",
       "url": "https://direzionemuseiroma.cultura.gov.it/en/pantheon/"
      }
     ]
    },
    {
     "id": "sant-ignazio-s-painted-false-dome",
     "start": 1065,
     "timeLabel": "~17:45",
     "kind": "sight",
     "icon": "sight",
     "title": "Sant'Ignazio's painted “false dome”",
     "end": 1075,
     "tip": "Stand on the marble disc in the nave. Hours not verified.",
     "cost": "Free",
     "tags": [
      "skipIfTired"
     ],
     "place": {
      "name": "Sant'Ignazio's painted “false dome”",
      "lat": 41.899,
      "lng": 12.4797,
      "query": "Sant'Ignazio di Loyola, Rome"
     },
     "minor": true
    },
    {
     "id": "galleria-sciarra",
     "start": 1075,
     "timeLabel": "~17:55",
     "kind": "sight",
     "icon": "sight",
     "title": "Galleria Sciarra",
     "end": 1085,
     "tip": "Via Marco Minghetti 10: a frescoed courtyard, almost empty. Weekdays only; if the gate is shut, try Monday morning.",
     "cost": "Free",
     "place": {
      "name": "Galleria Sciarra",
      "lat": 41.8998,
      "lng": 12.4812,
      "query": "Galleria Sciarra, Via Marco Minghetti 10, Rome"
     },
     "minor": true
    },
    {
     "id": "trevi-fountain",
     "start": 1085,
     "timeLabel": "~18:05",
     "kind": "sight",
     "icon": "sight",
     "title": "Trevi Fountain",
     "end": 1100,
     "tip": "On Fridays the basin area costs €2 from 11:30, card only at the gate. The coin toss needs the basin ticket.",
     "cost": "Piazza free · basin €2",
     "place": {
      "name": "Trevi Fountain",
      "lat": 41.9009,
      "lng": 12.4833,
      "query": "Trevi Fountain, Rome"
     },
     "scene": "trevi",
     "links": [
      {
       "label": "Official",
       "url": "https://fontanaditrevi.roma.it/en"
      }
     ]
    },
    {
     "id": "top-of-the-spanish-steps-for-sunset-18-38",
     "start": 1100,
     "timeLabel": "~18:20",
     "kind": "sight",
     "icon": "photo",
     "title": "Top of the Spanish Steps for sunset (18:38)",
     "end": 1160,
     "tip": "Blue hour until about 19:17. Standing and photos are fine; sitting costs a €250 fine.",
     "cost": "Free",
     "place": {
      "name": "Top of the Spanish Steps for sunset (18:38)",
      "lat": 41.9061,
      "lng": 12.4834,
      "query": "Trinità dei Monti, Rome"
     },
     "scene": "steps",
     "tod": "sunset"
    },
    {
     "id": "dinner-at-armando-al-pantheon",
     "start": 1170,
     "timeLabel": "19:30",
     "kind": "food",
     "icon": "food",
     "title": "Dinner at Armando al Pantheon",
     "end": 1275,
     "tip": "Salita de' Crescenzi 31. Order the rigatoni amatriciana, carbonara or saltimbocca; the pork-free classic is spaghetti aglio, olio e peperoncino. Ask for the bill by 21:00 if you're doing the crawl.",
     "cost": "~€30–45",
     "bookingId": "armando",
     "place": {
      "name": "Dinner at Armando al Pantheon",
      "lat": 41.8991,
      "lng": 12.4763,
      "query": "Armando al Pantheon, Rome"
     },
     "scene": "rigatoni",
     "links": [
      {
       "label": "Booking FAQ",
       "url": "https://armandoalpantheon.it/domande-frequenti/"
      }
     ]
    },
    {
     "id": "pick-frinight",
     "start": 1290,
     "timeLabel": "21:30",
     "kind": "night",
     "icon": "night",
     "title": "Pick your Friday night",
     "end": 1530,
     "options": {
      "label": "Pick your Friday night",
      "default": "crawl",
      "choices": [
       {
        "id": "crawl",
        "label": "Pub crawl",
        "title": "Rome's Ultimate Party pub crawl",
        "lines": [
         "Meet at The Highlander Pub, Vicolo di S. Biagio 9 (near the Spanish Steps), 21:30.",
         "About US$40 with one drink, or US$56 with a 1-hour open bar. Pizza, shots and club entry included; 4–5 hours; 18+.",
         "Rated 4.4–4.7/5, with good reviews from solo travellers. Book online; free cancellation up to 24 h."
        ],
        "place": null,
        "kind": "night",
        "icon": "night",
        "cost": "≈US$40–56",
        "badge": "Fastest way to make friends",
        "scene": "crawl",
        "links": [
         {
          "label": "Viator",
          "url": "https://www.viator.com/tours/Rome/Romes-Ultimate-Party-aka-the-Spanish-Steps-Pub-Crawl/d511-348679P2"
         }
        ]
       },
       {
        "id": "italian",
        "label": "Calmer crawl",
        "title": "Italian Pub Crawls",
        "lines": [
         "Meet at the Giordano Bruno statue in Campo de' Fiori.",
         "Three bars, drinks not included, club +€10. Nights aren't published, so check the site."
        ],
        "place": {
         "name": "Italian Pub Crawls",
         "lat": 41.8956,
         "lng": 12.4722,
         "query": "Giordano Bruno statue, Campo de' Fiori, Rome"
        },
        "kind": "night",
        "icon": "night",
        "cost": "€15 online · €20 door",
        "scene": "crawl",
        "links": [
         {
          "label": "Website",
          "url": "https://italianpubcrawls.com/rome-pub-crawl/"
         }
        ]
       },
       {
        "id": "hostel",
        "label": "Hostel party",
        "title": "YellowSquare's own party",
        "lines": [
         "A concert or party runs every night. Sit at the bar and say hi: the easiest start."
        ],
        "place": null,
        "kind": "night",
        "icon": "night",
        "cost": "Free",
        "scene": "hostel"
       },
       {
        "id": "clubs",
        "label": "Clubs",
        "title": "Straight to a club after about 00:30",
        "lines": [
         "Juno World at Lanificio 159, Via di Pietralata 159A: techno and house, €15, 22:00–05:00 (far out, take a taxi).",
         "UPNEO at NEO Club, Via degli Argonauti 18: house, €20, 23:00–05:00.",
         "Piper (hip-hop, reggaeton) and Muccassassina at Qube run Fridays in season; October 2026 isn't confirmed.",
         "Resident Advisor events are 21+: bring your passport."
        ],
        "place": null,
        "kind": "night",
        "icon": "night",
        "cost": "€15–20",
        "scene": "club",
        "links": [
         {
          "label": "Juno World",
          "url": "https://ra.co/events/2536929"
         },
         {
          "label": "UPNEO",
          "url": "https://ra.co/events/2541344"
         }
        ]
       }
      ]
     }
    },
    {
     "id": "trevi-at-night-free-and-lit",
     "start": 1320,
     "timeLabel": "After 22:00",
     "kind": "sight",
     "icon": "photo",
     "title": "Trevi at night: free and lit",
     "end": 1350,
     "tip": "The basin area is free after 22:00. Metro A from Spagna runs until about 01:30.",
     "cost": "Free",
     "place": {
      "name": "Trevi at night: free and lit",
      "lat": 41.9009,
      "lng": 12.4833,
      "query": "Trevi Fountain, Rome"
     },
     "scene": "trevi"
    }
   ],
   "alerts": [
    {
     "from": 420,
     "to": 480,
     "icon": "shirt",
     "text": "Long trousers and covered shoulders today: St Peter's checks at the door."
    },
    {
     "from": 1040,
     "to": 1118,
     "icon": "sunset",
     "text": "Sunset at 18:38: be at the top of the Spanish Steps by about 18:20."
    },
    {
     "from": 1380,
     "to": 1530,
     "icon": "metro",
     "text": "The metro runs until about 01:30 tonight."
    }
   ],
   "sun": {
    "rise": 435,
    "set": 1118,
    "blueAm": [
     397,
     418
    ],
    "bluePm": [
     1136,
     1157
    ]
   },
   "nearby": {
    "food": [
     {
      "name": "Hostaria Dino Express",
      "sub": "quick walk-in near the Vatican",
      "query": "Hostaria Dino Express, Rome",
      "scene": "rigatoni"
     },
     {
      "name": "Gelateria dei Gracchi",
      "sub": "gelato in Prati",
      "query": "Gelateria dei Gracchi, Rome",
      "scene": "gelato"
     },
     {
      "name": "Two Sizes",
      "sub": "tiramisù to go, Via del Governo Vecchio 88",
      "query": "Two Sizes, Via del Governo Vecchio 88, Rome",
      "scene": "tiramisu"
     },
     {
      "name": "Sant'Eustachio il Caffè",
      "sub": "espresso at the bar by the Pantheon",
      "query": "Sant'Eustachio il Caffè, Rome",
      "scene": "espresso"
     },
     {
      "name": "Pastificio Guerra",
      "sub": "€5 pasta at a standing counter, Via della Croce 8",
      "query": "Pastificio Guerra, Via della Croce 8, Rome",
      "scene": "cacio"
     }
    ],
    "photos": [
     "Gallery of Maps",
     "Momo staircase from the top",
     "St Peter's Square from the dome",
     "Angels on Ponte Sant'Angelo",
     "Via dei Coronari",
     "Galleria Sciarra",
     "Sunset over the rooftops from the Spanish Steps"
    ]
   }
  },
  {
   "id": "sat",
   "date": "2026-10-10",
   "num": "X",
   "label": "Ancient Rome",
   "title": "Ancient Rome, the Monti festival and the big night out",
   "cover": {
    "scene": "colosseum",
    "tod": "golden"
   },
   "facts": [
    {
     "icon": "sun",
     "text": "Sunrise 07:17"
    },
    {
     "icon": "sunset",
     "text": "Sunset 18:37"
    },
    {
     "icon": "moon",
     "text": "Blue hour 18:54–19:15"
    },
    {
     "icon": "metro",
     "text": "Last metro ~01:30"
    },
    {
     "icon": "bag",
     "text": "Bag ≤ 30×40×15 cm"
    }
   ],
   "stops": [
    {
     "id": "bar-breakfast-cornetto-cappuccino-at-the-counter",
     "start": 450,
     "timeLabel": "07:30",
     "kind": "food",
     "icon": "food",
     "title": "Bar breakfast: cornetto + cappuccino at the counter",
     "end": 480,
     "tip": "Pay at the till first, then hand the receipt to the barista.",
     "cost": "~€4–5",
     "minor": true
    },
    {
     "id": "metro-b-termini-colosseo",
     "start": 480,
     "timeLabel": "08:00",
     "kind": "move",
     "icon": "metro",
     "title": "Metro B, Termini → Colosseo",
     "tip": "Colosseo is now also an interchange with the new Metro C station Colosseo–Fori Imperiali (open since 16 Dec 2025), whose passages double as a small museum.",
     "cost": "€1.50 tap",
     "place": {
      "name": "Metro B, Termini → Colosseo",
      "lat": 41.8914,
      "lng": 12.4924,
      "query": "Metro B, Termini → Colosseo, Rome"
     },
     "via": {
      "line": "B",
      "from": "Termini",
      "to": "Colosseo"
     },
     "minor": true,
     "metro": [
      "B",
      "C"
     ]
    },
    {
     "id": "colosseum-security",
     "start": 495,
     "timeLabel": "08:15",
     "kind": "task",
     "icon": "shield",
     "title": "Colosseum security",
     "tip": "Your passport must match the ticket name. Arrive no more than 15 min early and no more than 15 min late. Bag max 30×40×15 cm, no cloakroom; no selfie sticks, glass bottles or costumes.",
     "minor": true
    },
    {
     "id": "colosseum",
     "start": 510,
     "timeLabel": "08:30–09:45",
     "kind": "sight",
     "icon": "sight",
     "title": "Colosseum",
     "end": 585,
     "tip": "The standard ticket allows 75 minutes inside, so go up to level 2 first.",
     "cost": "€18 or €24",
     "bookingId": "colosseum",
     "tags": [
      "must"
     ],
     "place": {
      "name": "Colosseum",
      "lat": 41.8902,
      "lng": 12.4922,
      "query": "Colosseum, Rome"
     },
     "scene": "colosseum",
     "links": [
      {
       "label": "Official tickets",
       "url": "https://ticketing.colosseo.it/en/"
      }
     ]
    },
    {
     "id": "roman-forum-palatine-hill",
     "start": 600,
     "timeLabel": "10:00–12:30",
     "kind": "sight",
     "icon": "sight",
     "title": "Roman Forum + Palatine Hill",
     "end": 750,
     "tip": "Opens 09:00; use it within 24 h of your Colosseum time.",
     "cost": "Included",
     "place": {
      "name": "Roman Forum + Palatine Hill",
      "lat": 41.8925,
      "lng": 12.4853,
      "query": "Roman Forum, Rome"
     },
     "scene": "forum"
    },
    {
     "id": "capitoline-hill-viewpoints-over-the-forum",
     "start": 750,
     "timeLabel": "~12:30",
     "kind": "sight",
     "icon": "photo",
     "title": "Capitoline Hill viewpoints over the Forum",
     "end": 795,
     "tip": "Behind Palazzo Senatorio, Via di Monte Tarpeo. The Capitoline Museums (€16.50 + €1 online, 09:30–19:30) are optional.",
     "cost": "Free",
     "tags": [
      "skipIfTired"
     ],
     "place": {
      "name": "Capitoline Hill viewpoints over the Forum",
      "lat": 41.8922,
      "lng": 12.483,
      "query": "Via di Monte Tarpeo, Rome"
     },
     "scene": "capitoline"
    },
    {
     "id": "lunch-in-monti",
     "start": 795,
     "timeLabel": "~13:15",
     "kind": "food",
     "icon": "food",
     "title": "Lunch in Monti",
     "end": 870,
     "tip": "La Taverna dei Fori Imperiali, Via della Madonna dei Monti (truffle cacio e pepe; book on 06 6798643; closed Tuesdays), or the Forno da Milvio bakery.",
     "cost": "€10–25",
     "place": {
      "name": "Lunch in Monti",
      "lat": 41.894,
      "lng": 12.49,
      "query": "La Taverna dei Fori Imperiali, Rome"
     },
     "scene": "cacio"
    },
    {
     "id": "pick-satafternoon",
     "start": 870,
     "timeLabel": "14:30–17:15",
     "kind": "rest",
     "icon": "rest",
     "title": "Pick your afternoon",
     "end": 1035,
     "options": {
      "label": "Pick your afternoon",
      "default": "siesta",
      "choices": [
       {
        "id": "siesta",
        "label": "Siesta",
        "title": "Siesta at the hostel (recommended)",
        "lines": [
         "You'll be out until about 04:00 tonight. Two hours of sleep now makes the night."
        ],
        "place": null,
        "kind": "rest",
        "icon": "rest",
        "cost": "Free",
        "scene": "hostel"
       },
       {
        "id": "argentina",
        "label": "Largo Argentina + Ghetto",
        "title": "Largo Argentina and the Jewish Ghetto",
        "lines": [
         "Largo Argentina temple walkway: €7, Tue–Sun 09:30–19:00 (last entry 18:45), groups every 20 min, entrance on Via di San Nicola de' Cesarini. Home to a famous cat shelter.",
         "Then the Jewish Ghetto and the Turtle Fountain in Piazza Mattei.",
         "Pork-free kosher food: Casalino, C'è Pasta…e Pasta, Bona (kosher pizza), Boccione (bakery). Kosher places may close for the Sabbath on Saturday, so check hours first."
        ],
        "place": {
         "name": "Largo Argentina and the Jewish Ghetto",
         "lat": 41.8955,
         "lng": 12.4768,
         "query": "Area Sacra di Largo Argentina, Rome"
        },
        "kind": "sight",
        "icon": "sight",
        "cost": "€7",
        "scene": "argentina",
        "links": [
         {
          "label": "Largo Argentina",
          "url": "https://www.sovraintendenzaroma.it/i_luoghi/roma_antica/aree_archeologiche/area_sacra_di_largo_argentina"
         }
        ]
       }
      ]
     }
    },
    {
     "id": "vittoriano-terrazza-delle-quadrighe-for-sunset-1",
     "start": 1065,
     "timeLabel": "~17:45",
     "kind": "sight",
     "icon": "photo",
     "title": "Vittoriano: Terrazza delle Quadrighe for sunset (18:37)",
     "end": 1155,
     "tip": "The €18 VIVE ticket is valid 7 days; buy online or at the ticket office. Be on top by 18:15. Last entry 18:45 or 19:00 (official pages differ); it closes 19:30.",
     "cost": "€18",
     "place": {
      "name": "Vittoriano: Terrazza delle Quadrighe for sunset (18:37)",
      "lat": 41.8951,
      "lng": 12.4828,
      "query": "Vittoriano, Piazza Venezia, Rome"
     },
     "scene": "vittoriano",
     "links": [
      {
       "label": "VIVE tickets",
       "url": "https://vive.midaticket.com/en/"
      }
     ]
    },
    {
     "id": "via-dei-fori-imperiali-past-the-floodlit-colosse",
     "start": 1155,
     "timeLabel": "~19:15",
     "kind": "sight",
     "icon": "photo",
     "title": "Via dei Fori Imperiali past the floodlit Colosseum",
     "end": 1170,
     "tip": "Blue-hour photos.",
     "cost": "Free",
     "place": {
      "name": "Via dei Fori Imperiali past the floodlit Colosseum",
      "lat": 41.8931,
      "lng": 12.488,
      "query": "Via dei Fori Imperiali past the floodlit Colosseum, Rome"
     },
     "scene": "colosseum"
    },
    {
     "id": "pick-satevening",
     "start": 1170,
     "timeLabel": "~19:30",
     "kind": "food",
     "icon": "food",
     "title": "Pick your evening",
     "end": 1380,
     "options": {
      "label": "Pick your evening",
      "default": "monti",
      "choices": [
       {
        "id": "monti",
        "label": "Monti festival",
        "title": "Ottobrata Monticiana, then dinner in Monti",
        "lines": [
         "A street festival in Monti on 9–11 Oct. In 2025 it used Piazza Madonna dei Monti, Via Panisperna and Via dei Serpenti; the 2026 programme wasn't out yet.",
         "Aperitivo on the Rooftop Spritzeria Monti: €13 cocktails with a Colosseum view, walk-ins OK.",
         "About 20:30 dinner: Trattoria Monti, Via di San Vito 13a (about €50 without wine; book a day ahead), or “apericena” at Fafiuchè."
        ],
        "place": {
         "name": "Ottobrata Monticiana, then dinner in Monti",
         "lat": 41.8953,
         "lng": 12.493,
         "query": "Piazza della Madonna dei Monti, Rome"
        },
        "kind": "food",
        "icon": "food",
        "cost": "Drinks €8–16 · dinner €25–50",
        "scene": "monti"
       },
       {
        "id": "tour",
        "label": "Food tour",
        "title": "Eating Europe: Twilight Trastevere food tour",
        "lines": [
         "About 4 hours, max 12 people, free cancellation up to 24 h.",
         "It's your dinner plus a ready-made group for the bars afterwards."
        ],
        "place": {
         "name": "Eating Europe: Twilight Trastevere food tour",
         "lat": 41.8894,
         "lng": 12.47,
         "query": "Eating Europe: Twilight Trastevere food tour, Rome"
        },
        "kind": "food",
        "icon": "food",
        "cost": "€94",
        "badge": "Guaranteed group",
        "scene": "alley",
        "links": [
         {
          "label": "Eating Europe",
          "url": "https://www.eatingeurope.com/rome/"
         }
        ]
       }
      ]
     }
    },
    {
     "id": "trastevere-bars",
     "start": 1380,
     "timeLabel": "~23:00",
     "kind": "night",
     "icon": "night",
     "title": "Trastevere bars",
     "end": 1500,
     "tip": "Bar San Calisto (€3 Peroni, €5 spritz, to 02:00), Freni e Frizioni (#31 in Europe's 50 Best Bars 2026), craft beer at Ma Che Siete Venuti a Fà, then the Piazza Trilussa fountain steps. Tram 8 from Piazza Venezia, or a taxi. Buy drinks in bars: shops can't sell takeaway alcohol after 22:00.",
     "cost": "€3–12 a drink",
     "place": {
      "name": "Trastevere bars",
      "lat": 41.889,
      "lng": 12.4697,
      "query": "Bar San Calisto, Rome"
     },
     "via": "ride",
     "scene": "alley"
    },
    {
     "id": "pick-satclub",
     "start": 1500,
     "timeLabel": "~01:00",
     "kind": "night",
     "icon": "night",
     "title": "Pick your club",
     "end": 1680,
     "options": {
      "label": "Pick your club",
      "default": "visionnaire",
      "helper": "All Resident Advisor events are 21+: bring your passport. RSVP or text for the list in the afternoon.",
      "choices": [
       {
        "id": "visionnaire",
        "label": "Visionnaire",
        "title": "Visionnaire, Via di Monte Testaccio 67",
        "lines": [
         "CONFUSION x MADFROG, 23:00–04:00.",
         "A free RSVP on Resident Advisor skips the line; otherwise €10 before 01:00 and €15 after."
        ],
        "place": {
         "name": "Visionnaire, Via di Monte Testaccio 67",
         "lat": 41.8762,
         "lng": 12.4742,
         "query": "Via di Monte Testaccio 67, Rome"
        },
        "kind": "night",
        "icon": "night",
        "cost": "Free RSVP · else €10 / €15",
        "via": "ride",
        "scene": "club",
        "links": [
         {
          "label": "RSVP on RA",
          "url": "https://ra.co/events/2541153"
         }
        ]
       },
       {
        "id": "illuminati",
        "label": "Circolo degli Illuminati",
        "title": "Circolo degli Illuminati, Via G. Libetta 1",
        "lines": [
         "MINÛ: Krol, house and minimal, 23:00–06:00.",
         "Guest list by text message: +39 3283464266."
        ],
        "place": {
         "name": "Circolo degli Illuminati, Via G. Libetta 1",
         "lat": 41.8665,
         "lng": 12.481,
         "query": "Circolo degli Illuminati, Via Giuseppe Libetta 1, Rome"
        },
        "kind": "night",
        "icon": "night",
        "cost": "€10",
        "via": "ride",
        "scene": "club",
        "links": [
         {
          "label": "Event on RA",
          "url": "https://ra.co/events/2547455"
         }
        ]
       },
       {
        "id": "piper",
        "label": "Piper / Novecento",
        "title": "Commercial: Piper “Babylonia” or Spazio Novecento",
        "lines": [
         "Piper runs “Babylonia” on Saturdays, with list + drink at €15–20. Spazio Novecento (EUR) plays techno to EDM.",
         "Neither is confirmed for October 2026, so check their pages that afternoon."
        ],
        "place": null,
        "kind": "night",
        "icon": "night",
        "cost": "€15–20",
        "scene": "club",
        "links": [
         {
          "label": "Piper",
          "url": "https://www.eventiglobo.it/piper-roma/"
         },
         {
          "label": "Spazio Novecento",
          "url": "https://www.eventdestination.net/it/discoteche/spazio-900/"
         }
        ]
       }
      ]
     }
    },
    {
     "id": "home-by-night-bus-nmb-or-an-official-taxi",
     "start": 1680,
     "timeLabel": "~04:00",
     "kind": "move",
     "icon": "taxi",
     "title": "Home by night bus nMB or an official taxi",
     "tip": "Taxi via FreeNow or 060609 (night start €7.50; centre–Testaccio about €15–20). Never an unmarked car.",
     "cost": "€1.50 / ~€20",
     "minor": true
    }
   ],
   "alerts": [
    {
     "from": 470,
     "to": 512,
     "icon": "bag",
     "text": "Colosseum: passport must match the ticket; bag max 30×40×15 cm, no cloakroom.",
     "tone": "warn"
    },
    {
     "from": 1035,
     "to": 1117,
     "icon": "sunset",
     "text": "Sunset at 18:37 from the Vittoriano terrace: be on top by 18:15."
    },
    {
     "from": 1320,
     "to": 1440,
     "icon": "alert",
     "text": "Shops stop selling takeaway alcohol at 22:00 tonight. Buy drinks in bars."
    },
    {
     "from": 1470,
     "to": 1590,
     "icon": "metro",
     "text": "Last metro about 01:30. After that: night bus nMB or an official taxi (FreeNow or 060609)."
    }
   ],
   "sun": {
    "rise": 437,
    "set": 1117,
    "blueAm": [
     398,
     419
    ],
    "bluePm": [
     1134,
     1155
    ]
   },
   "nearby": {
    "food": [
     {
      "name": "La Taverna dei Fori Imperiali",
      "sub": "truffle cacio e pepe; book",
      "query": "La Taverna dei Fori Imperiali, Rome",
      "scene": "cacio"
     },
     {
      "name": "Forno da Milvio",
      "sub": "bakery in Monti",
      "query": "Forno da Milvio, Rome",
      "scene": "pizzabianca"
     },
     {
      "name": "Trattoria Monti",
      "sub": "about €50 without wine; book a day ahead",
      "query": "Trattoria Monti, Via di San Vito 13a, Rome",
      "scene": "rigatoni"
     },
     {
      "name": "Fafiuchè",
      "sub": "“apericena”: an aperitivo big enough for dinner",
      "query": "Fafiuchè, Rome",
      "scene": "spritz"
     },
     {
      "name": "Drink Kong",
      "sub": "cocktails, #40 in the World's 50 Best Bars 2025",
      "query": "Drink Kong, Piazza di San Martino ai Monti 8, Rome",
      "scene": "spritz"
     }
    ],
    "photos": [
     "Colosseum level 2 in your first 45 minutes",
     "The Colosseum from above at Largo Gaetana Agnesi / the Via Nicola Salvi wall",
     "Arch of Constantine",
     "The Forum from the Capitoline terrace",
     "360° from the Vittoriano at sunset",
     "The floodlit Colosseum at blue hour",
     "Monti's festival streets",
     "Trastevere's lanterns"
    ]
   },
   "variants": {
    "sun": {
     "title": "Trastevere morning, Vittoriano sunset, big night out",
     "cover": {
      "scene": "alley",
      "tod": "day"
     },
     "stops": [
      {
       "id": "bar-breakfast-then-tram-8-to-trastevere",
       "start": 540,
       "timeLabel": "09:00",
       "kind": "food",
       "icon": "food",
       "title": "Bar breakfast, then tram 8 to Trastevere",
       "end": 585,
       "tip": "Tram 8 leaves from Piazza Venezia.",
       "cost": "~€4–5 + €1.50",
       "minor": true
      },
      {
       "id": "trastevere-lanes-piazza-di-santa-maria-in-traste",
       "start": 585,
       "timeLabel": "~09:45",
       "kind": "sight",
       "icon": "photo",
       "title": "Trastevere lanes → Piazza di Santa Maria in Trastevere",
       "end": 645,
       "tip": "Vicolo del Cedro, Vicolo della Torre, Vicolo Moroni, Via della Lungaretta. Emptiest in the morning.",
       "cost": "Free",
       "place": {
        "name": "Trastevere lanes → Piazza di Santa Maria in Trastevere",
        "lat": 41.8894,
        "lng": 12.47,
        "query": "Piazza di Santa Maria in Trastevere, Rome"
       },
       "via": "ride",
       "scene": "alley"
      },
      {
       "id": "tempietto-del-bramante-san-pietro-in-montorio",
       "start": 645,
       "timeLabel": "~10:45",
       "kind": "sight",
       "icon": "sight",
       "title": "Tempietto del Bramante (San Pietro in Montorio)",
       "end": 675,
       "tip": "Tue–Sun 10:00–18:00.",
       "cost": "Free",
       "place": {
        "name": "Tempietto del Bramante (San Pietro in Montorio)",
        "lat": 41.8886,
        "lng": 12.4667,
        "query": "Tempietto del Bramante, Rome"
       },
       "scene": "tempietto"
      },
      {
       "id": "pick-swaplunch",
       "start": 675,
       "timeLabel": "~11:15",
       "kind": "food",
       "icon": "food",
       "title": "Pick your lunch plan",
       "end": 780,
       "options": {
        "label": "Pick your lunch plan",
        "default": "enzo",
        "choices": [
         {
          "id": "enzo",
          "label": "Da Enzo al 29",
          "title": "Queue for Da Enzo al 29, then the Gianicolo view",
          "lines": [
           "Da Enzo, Via dei Vascellari 29, opens at 12:00 and takes no bookings: join the queue by about 11:15.",
           "After lunch, walk up to the Gianicolo terrace for the view (you'll miss the noon cannon)."
          ],
          "place": {
           "name": "Queue for Da Enzo al 29, then the Gianicolo view",
           "lat": 41.8883,
           "lng": 12.4768,
           "query": "Da Enzo al 29, Via dei Vascellari 29, Rome"
          },
          "kind": "food",
          "icon": "food",
          "cost": "Pasta €12–15",
          "scene": "carbonara",
          "links": [
           {
            "label": "Da Enzo",
            "url": "https://www.daenzoal29.com/"
           }
          ]
         },
         {
          "id": "cannon",
          "label": "Noon cannon first",
          "title": "Gianicolo noon cannon, then street-food lunch",
          "lines": [
           "Be on the Gianicolo terrace for the 12:00 cannon.",
           "Lunch afterwards: Supplì Roma, or a trapizzino at Piazza Trilussa 46."
          ],
          "place": {
           "name": "Gianicolo noon cannon, then street-food lunch",
           "lat": 41.8916,
           "lng": 12.4613,
           "query": "Terrazza del Gianicolo, Rome"
          },
          "kind": "sight",
          "icon": "sight",
          "cost": "€5–15",
          "scene": "skyline",
          "tod": "day"
         }
        ]
       }
      },
      {
       "id": "pick-satafternoon",
       "start": 870,
       "timeLabel": "14:30–17:15",
       "kind": "rest",
       "icon": "rest",
       "title": "Pick your afternoon",
       "end": 1035,
       "options": {
        "label": "Pick your afternoon",
        "default": "siesta",
        "choices": [
         {
          "id": "siesta",
          "label": "Siesta",
          "title": "Siesta at the hostel (recommended)",
          "lines": [
           "You'll be out until about 04:00 tonight. Two hours of sleep now makes the night."
          ],
          "place": null,
          "kind": "rest",
          "icon": "rest",
          "cost": "Free",
          "scene": "hostel"
         },
         {
          "id": "argentina",
          "label": "Largo Argentina + Ghetto",
          "title": "Largo Argentina and the Jewish Ghetto",
          "lines": [
           "Largo Argentina temple walkway: €7, Tue–Sun 09:30–19:00 (last entry 18:45), groups every 20 min, entrance on Via di San Nicola de' Cesarini. Home to a famous cat shelter.",
           "Then the Jewish Ghetto and the Turtle Fountain in Piazza Mattei.",
           "Pork-free kosher food: Casalino, C'è Pasta…e Pasta, Bona (kosher pizza), Boccione (bakery). Kosher places may close for the Sabbath on Saturday, so check hours first."
          ],
          "place": {
           "name": "Largo Argentina and the Jewish Ghetto",
           "lat": 41.8955,
           "lng": 12.4768,
           "query": "Area Sacra di Largo Argentina, Rome"
          },
          "kind": "sight",
          "icon": "sight",
          "cost": "€7",
          "scene": "argentina",
          "links": [
           {
            "label": "Largo Argentina",
            "url": "https://www.sovraintendenzaroma.it/i_luoghi/roma_antica/aree_archeologiche/area_sacra_di_largo_argentina"
           }
          ]
         }
        ]
       }
      },
      {
       "id": "vittoriano-terrazza-delle-quadrighe-for-sunset-1",
       "start": 1065,
       "timeLabel": "~17:45",
       "kind": "sight",
       "icon": "photo",
       "title": "Vittoriano: Terrazza delle Quadrighe for sunset (18:37)",
       "end": 1155,
       "tip": "The €18 VIVE ticket is valid 7 days; buy online or at the ticket office. Be on top by 18:15. Last entry 18:45 or 19:00 (official pages differ); it closes 19:30.",
       "cost": "€18",
       "place": {
        "name": "Vittoriano: Terrazza delle Quadrighe for sunset (18:37)",
        "lat": 41.8951,
        "lng": 12.4828,
        "query": "Vittoriano, Piazza Venezia, Rome"
       },
       "scene": "vittoriano",
       "links": [
        {
         "label": "VIVE tickets",
         "url": "https://vive.midaticket.com/en/"
        }
       ]
      },
      {
       "id": "via-dei-fori-imperiali-past-the-floodlit-colosse",
       "start": 1155,
       "timeLabel": "~19:15",
       "kind": "sight",
       "icon": "photo",
       "title": "Via dei Fori Imperiali past the floodlit Colosseum",
       "end": 1170,
       "tip": "Blue-hour photos.",
       "cost": "Free",
       "place": {
        "name": "Via dei Fori Imperiali past the floodlit Colosseum",
        "lat": 41.8931,
        "lng": 12.488,
        "query": "Via dei Fori Imperiali past the floodlit Colosseum, Rome"
       },
       "scene": "colosseum"
      },
      {
       "id": "pick-satevening",
       "start": 1170,
       "timeLabel": "~19:30",
       "kind": "food",
       "icon": "food",
       "title": "Pick your evening",
       "end": 1380,
       "options": {
        "label": "Pick your evening",
        "default": "monti",
        "choices": [
         {
          "id": "monti",
          "label": "Monti festival",
          "title": "Ottobrata Monticiana, then dinner in Monti",
          "lines": [
           "A street festival in Monti on 9–11 Oct. In 2025 it used Piazza Madonna dei Monti, Via Panisperna and Via dei Serpenti; the 2026 programme wasn't out yet.",
           "Aperitivo on the Rooftop Spritzeria Monti: €13 cocktails with a Colosseum view, walk-ins OK.",
           "About 20:30 dinner: Trattoria Monti, Via di San Vito 13a (about €50 without wine; book a day ahead), or “apericena” at Fafiuchè."
          ],
          "place": {
           "name": "Ottobrata Monticiana, then dinner in Monti",
           "lat": 41.8953,
           "lng": 12.493,
           "query": "Piazza della Madonna dei Monti, Rome"
          },
          "kind": "food",
          "icon": "food",
          "cost": "Drinks €8–16 · dinner €25–50",
          "scene": "monti"
         },
         {
          "id": "tour",
          "label": "Food tour",
          "title": "Eating Europe: Twilight Trastevere food tour",
          "lines": [
           "About 4 hours, max 12 people, free cancellation up to 24 h.",
           "It's your dinner plus a ready-made group for the bars afterwards."
          ],
          "place": {
           "name": "Eating Europe: Twilight Trastevere food tour",
           "lat": 41.8894,
           "lng": 12.47,
           "query": "Eating Europe: Twilight Trastevere food tour, Rome"
          },
          "kind": "food",
          "icon": "food",
          "cost": "€94",
          "badge": "Guaranteed group",
          "scene": "alley",
          "links": [
           {
            "label": "Eating Europe",
            "url": "https://www.eatingeurope.com/rome/"
           }
          ]
         }
        ]
       }
      },
      {
       "id": "trastevere-bars",
       "start": 1380,
       "timeLabel": "~23:00",
       "kind": "night",
       "icon": "night",
       "title": "Trastevere bars",
       "end": 1500,
       "tip": "Bar San Calisto (€3 Peroni, €5 spritz, to 02:00), Freni e Frizioni (#31 in Europe's 50 Best Bars 2026), craft beer at Ma Che Siete Venuti a Fà, then the Piazza Trilussa fountain steps. Tram 8 from Piazza Venezia, or a taxi. Buy drinks in bars: shops can't sell takeaway alcohol after 22:00.",
       "cost": "€3–12 a drink",
       "place": {
        "name": "Trastevere bars",
        "lat": 41.889,
        "lng": 12.4697,
        "query": "Bar San Calisto, Rome"
       },
       "via": "ride",
       "scene": "alley"
      },
      {
       "id": "pick-satclub",
       "start": 1500,
       "timeLabel": "~01:00",
       "kind": "night",
       "icon": "night",
       "title": "Pick your club",
       "end": 1680,
       "options": {
        "label": "Pick your club",
        "default": "visionnaire",
        "helper": "All Resident Advisor events are 21+: bring your passport. RSVP or text for the list in the afternoon.",
        "choices": [
         {
          "id": "visionnaire",
          "label": "Visionnaire",
          "title": "Visionnaire, Via di Monte Testaccio 67",
          "lines": [
           "CONFUSION x MADFROG, 23:00–04:00.",
           "A free RSVP on Resident Advisor skips the line; otherwise €10 before 01:00 and €15 after."
          ],
          "place": {
           "name": "Visionnaire, Via di Monte Testaccio 67",
           "lat": 41.8762,
           "lng": 12.4742,
           "query": "Via di Monte Testaccio 67, Rome"
          },
          "kind": "night",
          "icon": "night",
          "cost": "Free RSVP · else €10 / €15",
          "via": "ride",
          "scene": "club",
          "links": [
           {
            "label": "RSVP on RA",
            "url": "https://ra.co/events/2541153"
           }
          ]
         },
         {
          "id": "illuminati",
          "label": "Circolo degli Illuminati",
          "title": "Circolo degli Illuminati, Via G. Libetta 1",
          "lines": [
           "MINÛ: Krol, house and minimal, 23:00–06:00.",
           "Guest list by text message: +39 3283464266."
          ],
          "place": {
           "name": "Circolo degli Illuminati, Via G. Libetta 1",
           "lat": 41.8665,
           "lng": 12.481,
           "query": "Circolo degli Illuminati, Via Giuseppe Libetta 1, Rome"
          },
          "kind": "night",
          "icon": "night",
          "cost": "€10",
          "via": "ride",
          "scene": "club",
          "links": [
           {
            "label": "Event on RA",
            "url": "https://ra.co/events/2547455"
           }
          ]
         },
         {
          "id": "piper",
          "label": "Piper / Novecento",
          "title": "Commercial: Piper “Babylonia” or Spazio Novecento",
          "lines": [
           "Piper runs “Babylonia” on Saturdays, with list + drink at €15–20. Spazio Novecento (EUR) plays techno to EDM.",
           "Neither is confirmed for October 2026, so check their pages that afternoon."
          ],
          "place": null,
          "kind": "night",
          "icon": "night",
          "cost": "€15–20",
          "scene": "club",
          "links": [
           {
            "label": "Piper",
            "url": "https://www.eventiglobo.it/piper-roma/"
           },
           {
            "label": "Spazio Novecento",
            "url": "https://www.eventdestination.net/it/discoteche/spazio-900/"
           }
          ]
         }
        ]
       }
      },
      {
       "id": "home-by-night-bus-nmb-or-an-official-taxi",
       "start": 1680,
       "timeLabel": "~04:00",
       "kind": "move",
       "icon": "taxi",
       "title": "Home by night bus nMB or an official taxi",
       "tip": "Taxi via FreeNow or 060609 (night start €7.50; centre–Testaccio about €15–20). Never an unmarked car.",
       "cost": "€1.50 / ~€20",
       "minor": true
      }
     ],
     "banner": "Swapped for a Sunday Colosseum ticket: Trastevere moves to Saturday morning and the Colosseum to Sunday morning. Move or cancel your La Tavernaccia lunch booking; you lose Porta Portese, which was optional."
    }
   }
  },
  {
   "id": "sun",
   "date": "2026-10-11",
   "num": "XI",
   "label": "Trastevere",
   "title": "Trastevere, the Borghese and the Pincio sunset",
   "cover": {
    "scene": "skyline",
    "tod": "sunset"
   },
   "facts": [
    {
     "icon": "sun",
     "text": "Sunrise 07:18"
    },
    {
     "icon": "sunset",
     "text": "Sunset 18:35"
    },
    {
     "icon": "moon",
     "text": "Blue hour 18:52–19:14"
    },
    {
     "icon": "metro",
     "text": "Last metro 23:30"
    },
    {
     "icon": "alert",
     "text": "Vatican Museums closed"
    }
   ],
   "stops": [
    {
     "id": "porta-portese-flea-market",
     "start": 600,
     "timeLabel": "~10:00",
     "kind": "sight",
     "icon": "sight",
     "title": "Porta Portese flea market",
     "end": 645,
     "tip": "Piazza Ippolito Nievo / Via Ettore Rolli, Sundays 07:00–14:00. Watch your wallet.",
     "cost": "Free",
     "tags": [
      "optional"
     ],
     "place": {
      "name": "Porta Portese flea market",
      "lat": 41.8805,
      "lng": 12.4725,
      "query": "Porta Portese market, Rome"
     },
     "via": "ride",
     "scene": "market"
    },
    {
     "id": "trastevere-lanes-piazza-di-santa-maria-in-traste",
     "start": 645,
     "timeLabel": "~10:45",
     "kind": "sight",
     "icon": "photo",
     "title": "Trastevere lanes → Piazza di Santa Maria in Trastevere",
     "end": 690,
     "tip": "Vicolo del Cedro, Vicolo della Torre, Vicolo Moroni, Via della Lungaretta. Emptier before 11:00.",
     "cost": "Free",
     "place": {
      "name": "Trastevere lanes → Piazza di Santa Maria in Trastevere",
      "lat": 41.8894,
      "lng": 12.47,
      "query": "Piazza di Santa Maria in Trastevere, Rome"
     },
     "scene": "alley"
    },
    {
     "id": "tempietto-del-bramante-san-pietro-in-montorio",
     "start": 690,
     "timeLabel": "~11:30",
     "kind": "sight",
     "icon": "sight",
     "title": "Tempietto del Bramante (San Pietro in Montorio)",
     "end": 720,
     "tip": "Tue–Sun 10:00–18:00, on the way up the hill.",
     "cost": "Free",
     "place": {
      "name": "Tempietto del Bramante (San Pietro in Montorio)",
      "lat": 41.8886,
      "lng": 12.4667,
      "query": "Tempietto del Bramante, Rome"
     },
     "scene": "tempietto"
    },
    {
     "id": "pick-sunnoon",
     "start": 720,
     "timeLabel": "12:00",
     "kind": "sight",
     "icon": "sight",
     "title": "Pick your noon",
     "end": 780,
     "options": {
      "label": "Pick your noon",
      "default": "cannon",
      "note": "You can't do both.",
      "choices": [
       {
        "id": "cannon",
        "label": "Gianicolo cannon",
        "title": "Gianicolo terrace: the noon cannon",
        "lines": [
         "A cannon fires every day at 12:00 below the terrace, and the terrace has the best panorama of Rome's domes."
        ],
        "place": {
         "name": "Gianicolo terrace: the noon cannon",
         "lat": 41.8916,
         "lng": 12.4613,
         "query": "Terrazza del Gianicolo, Piazzale Giuseppe Garibaldi, Rome"
        },
        "kind": "sight",
        "icon": "sight",
        "cost": "Free",
        "scene": "skyline",
        "tod": "day"
       },
       {
        "id": "angelus",
        "label": "Pope's Angelus",
        "title": "The Angelus with Pope Leo XIV, St Peter's Square",
        "lines": [
         "About 15 minutes at 12:00. Expected, but not officially confirmed.",
         "Security queues are heavy 11:00–12:30, so arrive by about 11:45.",
         "Take a taxi to lunch afterwards."
        ],
        "place": {
         "name": "The Angelus with Pope Leo XIV, St Peter's Square",
         "lat": 41.9022,
         "lng": 12.457,
         "query": "St. Peter's Square, Vatican City"
        },
        "kind": "sight",
        "icon": "sight",
        "cost": "Free, no ticket",
        "via": "ride",
        "scene": "stpeters",
        "tod": "day",
        "links": [
         {
          "label": "St Peter's FAQ",
          "url": "https://www.basilicasanpietro.va/it/help/la-basilica"
         }
        ]
       }
      ]
     }
    },
    {
     "id": "sunday-lunch-la-tavernaccia-da-bruno",
     "start": 780,
     "timeLabel": "13:00",
     "kind": "food",
     "icon": "food",
     "title": "Sunday lunch: La Tavernaccia da Bruno",
     "end": 855,
     "tip": "Via Giovanni da Castel Bolognese 63, by Trastevere station. Open Sunday 12:45–15:00. Eggplant parmigiana, oxtail, and the famous Sunday lasagna.",
     "cost": "~€30–45",
     "bookingId": "tavernaccia",
     "place": {
      "name": "Sunday lunch: La Tavernaccia da Bruno",
      "lat": 41.8768,
      "lng": 12.469,
      "query": "La Tavernaccia da Bruno, Rome"
     },
     "scene": "lasagna",
     "links": [
      {
       "label": "Website",
       "url": "https://www.latavernacciaroma.com/"
      }
     ]
    },
    {
     "id": "pick-sunafternoon",
     "start": 855,
     "timeLabel": "14:15",
     "kind": "sight",
     "icon": "sight",
     "title": "Pick your afternoon",
     "end": 1020,
     "options": {
      "label": "Pick your afternoon",
      "default": "borghese",
      "choices": [
       {
        "id": "borghese",
        "label": "Borghese Gallery",
        "title": "Borghese Gallery, 15:00–17:00",
        "lines": [
         "14:15: taxi from lunch (Sunday start €5.00). Order it on FreeNow or 060609 while you pay.",
         "14:30: arrive 30 min early. Anything bigger than 21×15 cm goes to the mandatory bag drop, and late arrivals are refused.",
         "15:00: fixed 2-hour visit. Bernini's statues and Caravaggio."
        ],
        "place": {
         "name": "Borghese Gallery, 15:00–17:00",
         "lat": 41.9142,
         "lng": 12.4922,
         "query": "Galleria Borghese, Rome"
        },
        "kind": "sight",
        "icon": "sight",
        "cost": "about €13",
        "via": "ride",
        "scene": "borghese",
        "tod": "day",
        "bookingId": "borghese",
        "links": [
         {
          "label": "Official booking",
          "url": "https://www.gebart.it/musei/galleria-borghese/"
         }
        ]
       },
       {
        "id": "football",
        "label": "Lazio–Monza",
        "title": "Football: Lazio–Monza, 15:00, Stadio Olimpico",
        "lines": [
         "Buy only via sslazio.it → Vivaticket. ID is checked for every fan, so the ticket name must match your passport. Max 4 tickets, 3.80% online fee.",
         "Sale dates weren't published on 28 Sep. Borghese tickets are non-refundable, so decide before you book either one.",
         "Avoid resale sites."
        ],
        "place": null,
        "kind": "night",
        "icon": "night",
        "cost": "Price not out yet",
        "scene": "stadium",
        "tod": "day",
        "links": [
         {
          "label": "Lazio tickets",
          "url": "https://www.sslazio.it/en/biglietteria/matches"
         }
        ]
       }
      ]
     }
    },
    {
     "id": "villa-borghese-park-and-its-small-lake",
     "start": 1020,
     "timeLabel": "17:00",
     "kind": "sight",
     "icon": "photo",
     "title": "Villa Borghese park and its small lake",
     "end": 1090,
     "tip": "Rowing boats on the lake (price not verified). Walk on towards the Pincio.",
     "cost": "Free",
     "place": {
      "name": "Villa Borghese park and its small lake",
      "lat": 41.9131,
      "lng": 12.483,
      "query": "Laghetto di Villa Borghese, Rome"
     },
     "scene": "lake"
    },
    {
     "id": "terrazza-del-pincio-for-sunset-18-35",
     "start": 1090,
     "timeLabel": "~18:10",
     "kind": "sight",
     "icon": "photo",
     "title": "Terrazza del Pincio for sunset (18:35)",
     "end": 1155,
     "tip": "Blue hour until about 19:14. The sun sets to the right of St Peter's dome.",
     "cost": "Free",
     "place": {
      "name": "Terrazza del Pincio for sunset (18:35)",
      "lat": 41.9115,
      "lng": 12.4784,
      "query": "Terrazza del Pincio, Rome"
     },
     "scene": "skyline",
     "tod": "sunset"
    },
    {
     "id": "via-margutta-the-spanish-steps-lit-up",
     "start": 1155,
     "timeLabel": "~19:15",
     "kind": "sight",
     "icon": "photo",
     "title": "Via Margutta → the Spanish Steps lit up",
     "end": 1200,
     "tip": "Still no sitting on the steps.",
     "cost": "Free",
     "place": {
      "name": "Via Margutta → the Spanish Steps lit up",
      "lat": 41.9058,
      "lng": 12.4826,
      "query": "Spanish Steps, Rome"
     },
     "scene": "steps"
    },
    {
     "id": "dinner-at-a-sunday-open-place",
     "start": 1200,
     "timeLabel": "~20:00",
     "kind": "food",
     "icon": "food",
     "title": "Dinner at a Sunday-open place",
     "end": 1320,
     "tip": "Quick: Felice On The Go, Via delle Carrozze 12A (to 22:00), or Mercato Centrale inside Termini (to 23:30). Sit-down, book ahead: Taverna dei Fori Imperiali, Salumeria Roscioli (€20 no-show fee), Felice a Testaccio, Flavio al Velavevodetto.",
     "cost": "€10–45",
     "minor": true
    },
    {
     "id": "sun-trevi-at-night-free-and-lit",
     "start": 1320,
     "timeLabel": "After 22:00",
     "kind": "sight",
     "icon": "photo",
     "title": "Trevi at night: free and lit",
     "end": 1380,
     "tip": "Last metro on Sunday: 23:30.",
     "cost": "Free",
     "place": {
      "name": "Trevi at night: free and lit",
      "lat": 41.9009,
      "lng": 12.4833,
      "query": "Trevi Fountain, Rome"
     },
     "scene": "trevi"
    },
    {
     "id": "pick-sunnight",
     "start": 1380,
     "timeLabel": "~23:00",
     "kind": "night",
     "icon": "night",
     "title": "Pick your last night",
     "end": 1440,
     "options": {
      "label": "Pick your last night",
      "default": "hostel",
      "helper": "Early night either way: your alarm on Monday is 06:30.",
      "choices": [
       {
        "id": "hostel",
        "label": "Hostel party",
        "title": "YellowSquare's party",
        "lines": [
         "Sunday is quiet in the clubs (no Resident Advisor events), so the hostel is the best bet."
        ],
        "place": null,
        "kind": "night",
        "icon": "night",
        "cost": "Free",
        "scene": "hostel"
       },
       {
        "id": "alessandro",
        "label": "Alessandro Palace",
        "title": "Alessandro Palace hostel bar, Via Vicenza 42",
        "lines": [
         "Beer pong and happy hour on Sundays, 20:00–23:00."
        ],
        "place": {
         "name": "Alessandro Palace hostel bar, Via Vicenza 42",
         "lat": 41.9045,
         "lng": 12.5046,
         "query": "Alessandro Palace hostel bar, Via Vicenza 42, Rome"
        },
        "kind": "night",
        "icon": "night",
        "cost": "Cheap drinks",
        "scene": "crawl",
        "links": [
         {
          "label": "Website",
          "url": "https://alessandropalace.com/en/home-alessandro-palace/"
         }
        ]
       },
       {
        "id": "ghost",
        "label": "Ghost walk",
        "title": "What About Tours ghost walk, 20:00",
        "lines": [
         "A free tour: tip what it was worth. Check that it runs on Sunday."
        ],
        "place": null,
        "kind": "night",
        "icon": "night",
        "cost": "Tip-based",
        "scene": "alley",
        "links": [
         {
          "label": "Freetour.com",
          "url": "https://www.freetour.com/rome"
         }
        ]
       },
       {
        "id": "richter",
        "label": "Max Richter",
        "title": "Max Richter, “four seasons changed”, Teatro Argentina",
        "lines": [
         "Shows at 16:00 and 21:00 (Romaeuropa Festival)."
        ],
        "place": {
         "name": "Max Richter, “four seasons changed”, Teatro Argentina",
         "lat": 41.8953,
         "lng": 12.476,
         "query": "Max Richter, “four seasons changed”, Teatro Argentina, Rome"
        },
        "kind": "night",
        "icon": "night",
        "cost": "Price not listed",
        "scene": "theatre",
        "links": [
         {
          "label": "Romaeuropa",
          "url": "https://romaeuropa.net/en/"
         }
        ]
       }
      ]
     }
    }
   ],
   "alerts": [
    {
     "from": 540,
     "to": 720,
     "icon": "alert",
     "text": "The Vatican Museums are closed today."
    },
    {
     "from": 830,
     "to": 870,
     "icon": "clock",
     "text": "Borghese Gallery: be there by 14:30. Late arrivals are refused.",
     "tone": "warn"
    },
    {
     "from": 1050,
     "to": 1115,
     "icon": "sunset",
     "text": "Sunset at 18:35 on the Pincio terrace."
    },
    {
     "from": 1320,
     "to": 1410,
     "icon": "metro",
     "text": "Last metro on Sunday: 23:30.",
     "tone": "warn"
    },
    {
     "from": 1380,
     "to": 1500,
     "icon": "moon",
     "text": "Early night: your Monday alarm is 06:30."
    }
   ],
   "sun": {
    "rise": 438,
    "set": 1115,
    "blueAm": [
     399,
     421
    ],
    "bluePm": [
     1132,
     1154
    ]
   },
   "nearby": {
    "food": [
     {
      "name": "Felice On The Go",
      "sub": "grab-and-go to 22:00, Via delle Carrozze 12A",
      "query": "Felice On The Go, Via delle Carrozze 12A, Rome",
      "scene": "cacio"
     },
     {
      "name": "Mercato Centrale",
      "sub": "Termini food hall to 23:30; pasta €8–12",
      "query": "Mercato Centrale Roma, Termini",
      "scene": "taglio"
     },
     {
      "name": "Salumeria Roscioli",
      "sub": "sit-down; €20 no-show fee",
      "query": "Salumeria Roscioli, Rome",
      "scene": "carbonara"
     },
     {
      "name": "Felice a Testaccio",
      "sub": "open daily; book",
      "query": "Felice a Testaccio, Rome",
      "scene": "cacio"
     },
     {
      "name": "Flavio al Velavevodetto",
      "sub": "open daily; book",
      "query": "Flavio al Velavevodetto, Rome",
      "scene": "rigatoni"
     },
     {
      "name": "Cesare al Casaletto",
      "sub": "strong lunch alternative, tram 8",
      "query": "Cesare al Casaletto, Rome",
      "scene": "carbonara"
     }
    ],
    "photos": [
     "Empty Trastevere lanes",
     "The Gianicolo panorama",
     "Villa Borghese lake",
     "The Pincio at sunset",
     "Via Margutta",
     "The Spanish Steps and Trevi at night"
    ]
   },
   "variants": {
    "sun": {
     "title": "Colosseum morning, the Borghese and the Pincio sunset",
     "cover": {
      "scene": "colosseum",
      "tod": "golden"
     },
     "stops": [
      {
       "id": "metro-b-termini-colosseo",
       "start": 480,
       "timeLabel": "08:00",
       "kind": "move",
       "icon": "metro",
       "title": "Metro B, Termini → Colosseo",
       "tip": "Colosseo is now also an interchange with the new Metro C station Colosseo–Fori Imperiali (open since 16 Dec 2025), whose passages double as a small museum.",
       "cost": "€1.50 tap",
       "place": {
        "name": "Metro B, Termini → Colosseo",
        "lat": 41.8914,
        "lng": 12.4924,
        "query": "Metro B, Termini → Colosseo, Rome"
       },
       "via": {
        "line": "B",
        "from": "Termini",
        "to": "Colosseo"
       },
       "minor": true,
       "metro": [
        "B",
        "C"
       ]
      },
      {
       "id": "colosseum-security",
       "start": 495,
       "timeLabel": "08:15",
       "kind": "task",
       "icon": "shield",
       "title": "Colosseum security",
       "tip": "Your passport must match the ticket name. Arrive no more than 15 min early and no more than 15 min late. Bag max 30×40×15 cm, no cloakroom; no selfie sticks, glass bottles or costumes.",
       "minor": true
      },
      {
       "id": "colosseum",
       "start": 510,
       "timeLabel": "08:30–09:45",
       "kind": "sight",
       "icon": "sight",
       "title": "Colosseum",
       "end": 585,
       "tip": "The standard ticket allows 75 minutes inside, so go up to level 2 first.",
       "cost": "€18 or €24",
       "bookingId": "colosseum",
       "tags": [
        "must"
       ],
       "place": {
        "name": "Colosseum",
        "lat": 41.8902,
        "lng": 12.4922,
        "query": "Colosseum, Rome"
       },
       "scene": "colosseum",
       "links": [
        {
         "label": "Official tickets",
         "url": "https://ticketing.colosseo.it/en/"
        }
       ]
      },
      {
       "id": "roman-forum-palatine-hill",
       "start": 600,
       "timeLabel": "10:00–12:30",
       "kind": "sight",
       "icon": "sight",
       "title": "Roman Forum + Palatine Hill",
       "end": 750,
       "tip": "Opens 09:00; use it within 24 h of your Colosseum time.",
       "cost": "Included",
       "place": {
        "name": "Roman Forum + Palatine Hill",
        "lat": 41.8925,
        "lng": 12.4853,
        "query": "Roman Forum, Rome"
       },
       "scene": "forum"
      },
      {
       "id": "capitoline-hill-viewpoints-over-the-forum",
       "start": 750,
       "timeLabel": "~12:30",
       "kind": "sight",
       "icon": "photo",
       "title": "Capitoline Hill viewpoints over the Forum",
       "end": 795,
       "tip": "Behind Palazzo Senatorio, Via di Monte Tarpeo. The Capitoline Museums (€16.50 + €1 online, 09:30–19:30) are optional.",
       "cost": "Free",
       "tags": [
        "skipIfTired"
       ],
       "place": {
        "name": "Capitoline Hill viewpoints over the Forum",
        "lat": 41.8922,
        "lng": 12.483,
        "query": "Via di Monte Tarpeo, Rome"
       },
       "scene": "capitoline"
      },
      {
       "id": "lunch-in-monti",
       "start": 795,
       "timeLabel": "~13:15",
       "kind": "food",
       "icon": "food",
       "title": "Lunch in Monti: Taverna dei Fori Imperiali",
       "end": 855,
       "tip": "Open on Sunday; booking essential (06 6798643). Truffle cacio e pepe.",
       "cost": "€10–25",
       "place": {
        "name": "Lunch in Monti: Taverna dei Fori Imperiali",
        "lat": 41.894,
        "lng": 12.49,
        "query": "La Taverna dei Fori Imperiali, Rome"
       },
       "scene": "cacio"
      },
      {
       "id": "pick-sunafternoon",
       "start": 855,
       "timeLabel": "14:15",
       "kind": "sight",
       "icon": "sight",
       "title": "Pick your afternoon",
       "end": 1020,
       "options": {
        "label": "Pick your afternoon",
        "default": "borghese",
        "choices": [
         {
          "id": "borghese",
          "label": "Borghese Gallery",
          "title": "Borghese Gallery, 15:00–17:00",
          "lines": [
           "14:15: taxi from lunch (Sunday start €5.00). Order it on FreeNow or 060609 while you pay.",
           "14:30: arrive 30 min early. Anything bigger than 21×15 cm goes to the mandatory bag drop, and late arrivals are refused.",
           "15:00: fixed 2-hour visit. Bernini's statues and Caravaggio."
          ],
          "place": {
           "name": "Borghese Gallery, 15:00–17:00",
           "lat": 41.9142,
           "lng": 12.4922,
           "query": "Galleria Borghese, Rome"
          },
          "kind": "sight",
          "icon": "sight",
          "cost": "about €13",
          "via": "ride",
          "scene": "borghese",
          "tod": "day",
          "bookingId": "borghese",
          "links": [
           {
            "label": "Official booking",
            "url": "https://www.gebart.it/musei/galleria-borghese/"
           }
          ]
         },
         {
          "id": "football",
          "label": "Lazio–Monza",
          "title": "Football: Lazio–Monza, 15:00, Stadio Olimpico",
          "lines": [
           "Buy only via sslazio.it → Vivaticket. ID is checked for every fan, so the ticket name must match your passport. Max 4 tickets, 3.80% online fee.",
           "Sale dates weren't published on 28 Sep. Borghese tickets are non-refundable, so decide before you book either one.",
           "Avoid resale sites."
          ],
          "place": null,
          "kind": "night",
          "icon": "night",
          "cost": "Price not out yet",
          "scene": "stadium",
          "tod": "day",
          "links": [
           {
            "label": "Lazio tickets",
            "url": "https://www.sslazio.it/en/biglietteria/matches"
           }
          ]
         }
        ]
       }
      },
      {
       "id": "villa-borghese-park-and-its-small-lake",
       "start": 1020,
       "timeLabel": "17:00",
       "kind": "sight",
       "icon": "photo",
       "title": "Villa Borghese park and its small lake",
       "end": 1090,
       "tip": "Rowing boats on the lake (price not verified). Walk on towards the Pincio.",
       "cost": "Free",
       "place": {
        "name": "Villa Borghese park and its small lake",
        "lat": 41.9131,
        "lng": 12.483,
        "query": "Laghetto di Villa Borghese, Rome"
       },
       "scene": "lake"
      },
      {
       "id": "terrazza-del-pincio-for-sunset-18-35",
       "start": 1090,
       "timeLabel": "~18:10",
       "kind": "sight",
       "icon": "photo",
       "title": "Terrazza del Pincio for sunset (18:35)",
       "end": 1155,
       "tip": "Blue hour until about 19:14. The sun sets to the right of St Peter's dome.",
       "cost": "Free",
       "place": {
        "name": "Terrazza del Pincio for sunset (18:35)",
        "lat": 41.9115,
        "lng": 12.4784,
        "query": "Terrazza del Pincio, Rome"
       },
       "scene": "skyline",
       "tod": "sunset"
      },
      {
       "id": "via-margutta-the-spanish-steps-lit-up",
       "start": 1155,
       "timeLabel": "~19:15",
       "kind": "sight",
       "icon": "photo",
       "title": "Via Margutta → the Spanish Steps lit up",
       "end": 1200,
       "tip": "Still no sitting on the steps.",
       "cost": "Free",
       "place": {
        "name": "Via Margutta → the Spanish Steps lit up",
        "lat": 41.9058,
        "lng": 12.4826,
        "query": "Spanish Steps, Rome"
       },
       "scene": "steps"
      },
      {
       "id": "dinner-at-a-sunday-open-place",
       "start": 1200,
       "timeLabel": "~20:00",
       "kind": "food",
       "icon": "food",
       "title": "Dinner at a Sunday-open place",
       "end": 1320,
       "tip": "Quick: Felice On The Go, Via delle Carrozze 12A (to 22:00), or Mercato Centrale inside Termini (to 23:30). Sit-down, book ahead: Taverna dei Fori Imperiali, Salumeria Roscioli (€20 no-show fee), Felice a Testaccio, Flavio al Velavevodetto.",
       "cost": "€10–45",
       "minor": true
      },
      {
       "id": "sun-trevi-at-night-free-and-lit",
       "start": 1320,
       "timeLabel": "After 22:00",
       "kind": "sight",
       "icon": "photo",
       "title": "Trevi at night: free and lit",
       "end": 1380,
       "tip": "Last metro on Sunday: 23:30.",
       "cost": "Free",
       "place": {
        "name": "Trevi at night: free and lit",
        "lat": 41.9009,
        "lng": 12.4833,
        "query": "Trevi Fountain, Rome"
       },
       "scene": "trevi"
      },
      {
       "id": "pick-sunnight",
       "start": 1380,
       "timeLabel": "~23:00",
       "kind": "night",
       "icon": "night",
       "title": "Pick your last night",
       "end": 1440,
       "options": {
        "label": "Pick your last night",
        "default": "hostel",
        "helper": "Early night either way: your alarm on Monday is 06:30.",
        "choices": [
         {
          "id": "hostel",
          "label": "Hostel party",
          "title": "YellowSquare's party",
          "lines": [
           "Sunday is quiet in the clubs (no Resident Advisor events), so the hostel is the best bet."
          ],
          "place": null,
          "kind": "night",
          "icon": "night",
          "cost": "Free",
          "scene": "hostel"
         },
         {
          "id": "alessandro",
          "label": "Alessandro Palace",
          "title": "Alessandro Palace hostel bar, Via Vicenza 42",
          "lines": [
           "Beer pong and happy hour on Sundays, 20:00–23:00."
          ],
          "place": {
           "name": "Alessandro Palace hostel bar, Via Vicenza 42",
           "lat": 41.9045,
           "lng": 12.5046,
           "query": "Alessandro Palace hostel bar, Via Vicenza 42, Rome"
          },
          "kind": "night",
          "icon": "night",
          "cost": "Cheap drinks",
          "scene": "crawl",
          "links": [
           {
            "label": "Website",
            "url": "https://alessandropalace.com/en/home-alessandro-palace/"
           }
          ]
         },
         {
          "id": "ghost",
          "label": "Ghost walk",
          "title": "What About Tours ghost walk, 20:00",
          "lines": [
           "A free tour: tip what it was worth. Check that it runs on Sunday."
          ],
          "place": null,
          "kind": "night",
          "icon": "night",
          "cost": "Tip-based",
          "scene": "alley",
          "links": [
           {
            "label": "Freetour.com",
            "url": "https://www.freetour.com/rome"
           }
          ]
         },
         {
          "id": "richter",
          "label": "Max Richter",
          "title": "Max Richter, “four seasons changed”, Teatro Argentina",
          "lines": [
           "Shows at 16:00 and 21:00 (Romaeuropa Festival)."
          ],
          "place": {
           "name": "Max Richter, “four seasons changed”, Teatro Argentina",
           "lat": 41.8953,
           "lng": 12.476,
           "query": "Max Richter, “four seasons changed”, Teatro Argentina, Rome"
          },
          "kind": "night",
          "icon": "night",
          "cost": "Price not listed",
          "scene": "theatre",
          "links": [
           {
            "label": "Romaeuropa",
            "url": "https://romaeuropa.net/en/"
           }
          ]
         }
        ]
       }
      }
     ],
     "banner": "Swapped for a Sunday Colosseum ticket: Trastevere moves to Saturday morning and the Colosseum to Sunday morning. Move or cancel your La Tavernaccia lunch booking; you lose Porta Portese, which was optional."
    }
   }
  },
  {
   "id": "mon",
   "date": "2026-10-12",
   "num": "XII",
   "label": "Fly home",
   "title": "A sunrise walk, then fly home",
   "cover": {
    "scene": "steps",
    "tod": "dawn"
   },
   "facts": [
    {
     "icon": "sun",
     "text": "Sunrise 07:19"
    },
    {
     "icon": "train",
     "text": "Leonardo Express 11:05"
    },
    {
     "icon": "plane",
     "text": "Pegasus 14:50"
    },
    {
     "icon": "alert",
     "text": "Borghese, Castel Sant'Angelo closed"
    }
   ],
   "stops": [
    {
     "id": "check-out-and-leave-your-bag-at-reception",
     "start": 400,
     "timeLabel": "06:40",
     "kind": "rest",
     "icon": "bed",
     "title": "Check out and leave your bag at reception",
     "tip": "Ask the night before: bag storage on checkout day is common but not confirmed for YellowSquare. Backup: KiPoint/KiBag inside Termini, Via Giolitti 34/40 by platform 24, 07:00–21:00, from €6 a bag.",
     "links": [
      {
       "label": "KiBag",
       "url": "https://www.kibag.it/en/deposito-bagagli-roma/deposito-bagagli-roma-termini/"
      }
     ],
     "minor": true
    },
    {
     "id": "metro-a-termini-spagna",
     "start": 410,
     "timeLabel": "06:50",
     "kind": "move",
     "icon": "metro",
     "title": "Metro A, Termini → Spagna",
     "tip": "The metro opens at 05:30.",
     "cost": "€1.50 tap",
     "place": {
      "name": "Metro A, Termini → Spagna",
      "lat": 41.9068,
      "lng": 12.4847,
      "query": "Metro A, Termini → Spagna, Rome"
     },
     "via": {
      "line": "A",
      "from": "Termini",
      "to": "Spagna"
     },
     "minor": true,
     "metro": [
      "A"
     ]
    },
    {
     "id": "spanish-steps-nearly-empty-sunrise-07-19",
     "start": 420,
     "timeLabel": "~07:00",
     "kind": "sight",
     "icon": "photo",
     "title": "Spanish Steps, nearly empty (sunrise 07:19)",
     "end": 445,
     "tip": "The best empty-steps shot of the trip.",
     "cost": "Free",
     "place": {
      "name": "Spanish Steps, nearly empty (sunrise 07:19)",
      "lat": 41.9058,
      "lng": 12.4826,
      "query": "Spanish Steps, Rome"
     },
     "scene": "steps"
    },
    {
     "id": "trevi-fountain-from-the-piazza",
     "start": 445,
     "timeLabel": "~07:25",
     "kind": "sight",
     "icon": "photo",
     "title": "Trevi Fountain from the piazza",
     "end": 465,
     "tip": "Monday is a maintenance day: ticketing only from 14:00, and the basin may be closed or have workers. The piazza view is free.",
     "cost": "Free",
     "place": {
      "name": "Trevi Fountain from the piazza",
      "lat": 41.9009,
      "lng": 12.4833,
      "query": "Trevi Fountain, Rome"
     },
     "scene": "trevi"
    },
    {
     "id": "bar-breakfast-at-the-counter",
     "start": 465,
     "timeLabel": "~07:45",
     "kind": "food",
     "icon": "food",
     "title": "Bar breakfast at the counter",
     "end": 500,
     "cost": "~€4–5",
     "minor": true
    },
    {
     "id": "piazza-navona-almost-empty",
     "start": 510,
     "timeLabel": "~08:30",
     "kind": "sight",
     "icon": "photo",
     "title": "Piazza Navona, almost empty",
     "end": 540,
     "cost": "Free",
     "place": {
      "name": "Piazza Navona, almost empty",
      "lat": 41.8992,
      "lng": 12.4731,
      "query": "Piazza Navona, Rome"
     },
     "scene": "navona"
    },
    {
     "id": "pick-monnine",
     "start": 540,
     "timeLabel": "09:00",
     "kind": "sight",
     "icon": "sight",
     "title": "Pick your last visit",
     "end": 580,
     "options": {
      "label": "Pick your last visit",
      "default": "pantheon",
      "choices": [
       {
        "id": "pantheon",
        "label": "Pantheon",
        "title": "Pantheon, first entry at 09:00",
        "lines": [
         "Only if you didn't go on Friday. Book a timed slot on Musei Italiani."
        ],
        "place": {
         "name": "Pantheon, first entry at 09:00",
         "lat": 41.8986,
         "lng": 12.4769,
         "query": "Pantheon, Rome"
        },
        "kind": "sight",
        "icon": "sight",
        "cost": "€7",
        "scene": "pantheon",
        "bookingId": "pantheon",
        "links": [
         {
          "label": "Pantheon tickets",
          "url": "https://direzionemuseiroma.cultura.gov.it/en/pantheon/"
         }
        ]
       },
       {
        "id": "sciarra",
        "label": "Galleria Sciarra",
        "title": "Galleria Sciarra, Via Marco Minghetti 10",
        "lines": [
         "A frescoed courtyard, open weekdays from 09:00. A quiet last look."
        ],
        "place": {
         "name": "Galleria Sciarra, Via Marco Minghetti 10",
         "lat": 41.8998,
         "lng": 12.4812,
         "query": "Galleria Sciarra, Via Marco Minghetti 10, Rome"
        },
        "kind": "sight",
        "icon": "sight",
        "cost": "Free",
        "scene": "gallery"
       }
      ]
     }
    },
    {
     "id": "bus-40-or-64-from-largo-argentina-to-termini-or-",
     "start": 580,
     "timeLabel": "~09:40",
     "kind": "move",
     "icon": "bus",
     "title": "Bus 40 or 64 from Largo Argentina to Termini, or a taxi",
     "end": 615,
     "tip": "Pickpocket buses: bag in front.",
     "cost": "€1.50 / from €3.50",
     "place": {
      "name": "Bus 40 or 64 from Largo Argentina to Termini, or a taxi",
      "lat": 41.901,
      "lng": 12.5018,
      "query": "Bus 40 or 64 from Largo Argentina to Termini, or a taxi, Rome"
     },
     "via": "ride",
     "minor": true
    },
    {
     "id": "collect-your-bag-at-the-hostel-walk-to-termini",
     "start": 615,
     "timeLabel": "~10:15",
     "kind": "rest",
     "icon": "bed",
     "title": "Collect your bag at the hostel, walk to Termini",
     "end": 645,
     "minor": true
    },
    {
     "id": "termini-platforms-23-24-buy-and-validate-the-leo",
     "start": 645,
     "timeLabel": "~10:45",
     "kind": "move",
     "icon": "train",
     "title": "Termini platforms 23–24: buy and validate the Leonardo Express ticket",
     "end": 665,
     "tip": "Tap&Go and bus tickets are not valid on this train.",
     "cost": "€14",
     "place": {
      "name": "Termini platforms 23–24: buy and validate the Leonardo Express ticket",
      "lat": 41.8994,
      "lng": 12.5033,
      "query": "Termini platforms 23–24: buy and validate the Leonardo Express ticket, Rome"
     },
     "minor": true
    },
    {
     "id": "leonardo-express-to-fiumicino-arrives-11-37",
     "start": 665,
     "timeLabel": "11:05",
     "kind": "move",
     "icon": "train",
     "title": "Leonardo Express to Fiumicino (arrives 11:37)",
     "end": 697,
     "tip": "Backups: 10:50 or 11:20. By taxi (€55) leave by 10:45; the SIT bus from Via Marsala 5 (10:10, 10:30, 10:50) takes 50–70 min.",
     "tags": [
      "must"
     ],
     "scene": "train",
     "links": [
      {
       "label": "Timetable",
       "url": "https://www.trenitalia.com/content/dam/trenitalia/allegati/info/orario-digitale/collegamenti/orari-leonardo-express.pdf"
      }
     ],
     "offToAirport": true
    },
    {
     "id": "terminal-3-pegasus-counter-security-passport-con",
     "start": 710,
     "timeLabel": "~11:50",
     "kind": "move",
     "icon": "flight",
     "title": "Terminal 3: Pegasus counter, security, passport control",
     "end": 850,
     "tip": "The counter closes 13:50. At exit control your passport is scanned and your face and/or fingerprints are checked against your entry record (EU Entry/Exit System); no stamp. There's no queue data for FCO, hence the buffer. Latest safe arrival at T3: about 12:20.",
     "tags": [
      "must"
     ],
     "minor": true
    },
    {
     "id": "at-the-gate-it-closes-14-30",
     "start": 850,
     "timeLabel": "14:10",
     "kind": "move",
     "icon": "flight",
     "title": "At the gate (it closes 14:30)",
     "end": 890,
     "minor": true
    },
    {
     "id": "pegasus-to-istanbul-sabiha-gokcen-or-your-turkis",
     "start": 890,
     "timeLabel": "14:50",
     "kind": "move",
     "icon": "flight",
     "title": "Pegasus to Istanbul Sabiha Gökçen (or your Turkish destination)",
     "end": 960,
     "tip": "If you're a Turkish citizen, nothing extra is needed to enter Türkiye. Buon viaggio!",
     "scene": "plane"
    }
   ],
   "alerts": [
    {
     "from": 380,
     "to": 410,
     "icon": "bag",
     "text": "Check out and leave your bag at reception before the sunrise walk."
    },
    {
     "from": 600,
     "to": 666,
     "icon": "train",
     "text": "Leonardo Express 11:05 from platforms 23–24. Buy and validate the €14 ticket.",
     "tone": "warn"
    },
    {
     "from": 700,
     "to": 850,
     "icon": "plane",
     "text": "Pegasus counter closes at 13:50; be at the gate by 14:10.",
     "tone": "warn"
    }
   ],
   "sun": {
    "rise": 439,
    "set": 1114,
    "blueAm": [
     400,
     422
    ],
    "bluePm": [
     1131,
     1152
    ]
   },
   "journey": {
    "title": "To the airport",
    "nodes": [
     {
      "time": "10:45",
      "name": "Termini, platforms 23–24",
      "sub": "buy + validate the €14 ticket",
      "mode": ""
     },
     {
      "time": "11:37",
      "name": "Fiumicino T3",
      "sub": "Leonardo Express 11:05",
      "mode": "ride"
     },
     {
      "time": "13:50",
      "name": "Pegasus counter closes",
      "sub": "then security + passport control",
      "mode": "walk"
     },
     {
      "time": "14:10",
      "name": "At the gate",
      "sub": "gate closes 14:30",
      "mode": "walk"
     },
     {
      "time": "14:50",
      "name": "Take off",
      "sub": "Pegasus",
      "mode": ""
     },
     {
      "time": "",
      "name": "Istanbul Sabiha Gökçen",
      "sub": "or your Turkish destination",
      "mode": "fly",
      "label": "Pegasus 14:50"
     }
    ]
   },
   "nearby": {
    "food": [
     {
      "name": "Pasticceria Regoli",
      "sub": "maritozzo; opens about 06:30–07:00",
      "query": "Pasticceria Regoli, Rome",
      "scene": "maritozzo"
     },
     {
      "name": "Mercato Centrale",
      "sub": "inside Termini, from 07:30",
      "query": "Mercato Centrale Roma, Termini",
      "scene": "espresso"
     }
    ],
    "photos": [
     "Empty Spanish Steps",
     "Trevi from the piazza",
     "Empty Piazza Navona",
     "The Pantheon portico at dawn"
    ],
    "cards": [
     {
      "title": "Closed today, so not planned",
      "icon": "alert",
      "items": [
       {
        "icon": "x",
        "text": "Borghese, Castel Sant'Angelo, Largo Argentina, Baths of Caracalla, Domus Aurea, Ostia Antica, Tempietto"
       },
       {
        "icon": "info",
        "text": "The Vatican Museums are open, but there isn't enough time."
       }
      ]
     }
    ]
   }
  }
 ],
 "bookings": [
  {
   "id": "hostel",
   "due": "2026-09-28",
   "dueLabel": "Now",
   "title": "Book YellowSquare: check-in Thu 8 Oct, check-out Mon 12 Oct (4 nights)",
   "asap": true,
   "key": "Hostel",
   "detail": "Not from the 9th, even though you arrive after midnight. Then send your flight and arrival time (about 01:00) on WhatsApp: +39 064463554.",
   "cost": "dorm ~€35–70/night + €3.50/night tax",
   "links": [
    {
     "label": "yellowsquare.com",
     "url": "https://yellowsquare.com/rome/"
    }
   ],
   "scene": {
    "scene": "hostel",
    "tod": "night"
   }
  },
  {
   "id": "vatican",
   "due": "2026-09-28",
   "dueLabel": "Now",
   "title": "Vatican Museums, Fri 9 Oct, 08:00",
   "asap": true,
   "key": "Vatican",
   "detail": "Official site only.",
   "cost": "€25",
   "links": [
    {
     "label": "tickets.museivaticani.va",
     "url": "https://tickets.museivaticani.va"
    }
   ],
   "scene": {
    "scene": "spiral",
    "tod": "day"
   }
  },
  {
   "id": "colosseum",
   "due": "2026-09-28",
   "dueLabel": "Now",
   "title": "Colosseum: any leftover slot on Sat 10 Oct (Sun 11 is the backup)",
   "asap": true,
   "key": "Colosseum",
   "detail": "Type your name exactly as in your passport; tickets are checked against your ID.",
   "cost": "€18",
   "links": [
    {
     "label": "ticketing.colosseo.it",
     "url": "https://ticketing.colosseo.it/en/"
    }
   ],
   "scene": {
    "scene": "colosseum",
    "tod": "golden"
   }
  },
  {
   "id": "borghese",
   "due": "2026-09-28",
   "dueLabel": "Now",
   "title": "Borghese Gallery, Sun 11 Oct, 15:00",
   "asap": true,
   "key": "Borghese",
   "detail": "Non-refundable and can't be changed. The official site shows about €13; the museum page and other sites say €18.",
   "cost": "about €13",
   "links": [
    {
     "label": "gebart.it (official)",
     "url": "https://www.gebart.it/musei/galleria-borghese/"
    }
   ],
   "scene": {
    "scene": "borghese",
    "tod": "day"
   }
  },
  {
   "id": "armando",
   "due": "2026-09-28",
   "dueLabel": "Now",
   "title": "Armando al Pantheon, Fri 9 Oct ~19:30",
   "asap": true,
   "key": "Armando",
   "detail": "Online booking only, on a 30-day rolling window. If it's full, ask in person for cancellations.",
   "cost": "~€30–45",
   "links": [
    {
     "label": "armandoalpantheon.it",
     "url": "https://armandoalpantheon.it/domande-frequenti/"
    }
   ],
   "scene": {
    "scene": "rigatoni",
    "tod": "day"
   }
  },
  {
   "id": "tavernaccia",
   "due": "2026-09-28",
   "dueLabel": "Now",
   "title": "Sunday lunch: La Tavernaccia, Sun 11 Oct, 13:00",
   "asap": true,
   "key": "Sunday lunch",
   "detail": "Book by phone on +39 06 5812792 or by email: latavernaccia.roma@gmail.com.",
   "cost": "~€30–45",
   "scene": {
    "scene": "lasagna",
    "tod": "day"
   }
  },
  {
   "id": "pegbag",
   "due": "2026-09-28",
   "dueLabel": "Now",
   "title": "Check your Pegasus bag allowance",
   "asap": true,
   "detail": "The cheapest fare allows one 40×30×15 cm bag, max 3 kg. Extra baggage is cheapest online.",
   "links": [
    {
     "label": "Pegasus bundles",
     "url": "https://www.flypgs.com/en/travel-services/flight-services/flight-packages"
    }
   ],
   "scene": {
    "scene": "plane",
    "tod": "day"
   }
  },
  {
   "id": "bank",
   "due": "2026-09-28",
   "dueLabel": "Now",
   "title": "Bank app: turn on foreign and online use for your Visa/Mastercard",
   "asap": true,
   "detail": "Ask about the foreign-transaction fee. TROY-only cards won't work on Rome's tap-to-pay transport."
  },
  {
   "id": "hw",
   "due": "2026-09-28",
   "dueLabel": "Now",
   "title": "Join Rome's City Chat in the Hostelworld app",
   "asap": true,
   "detail": "It opens 14 days before arrival once you have a bed booked. Post “Anyone for the Vatican at 8 on Friday?”",
   "links": [
    {
     "label": "Hostelworld Linkups",
     "url": "https://www.hostelworld.com/linkups"
    }
   ]
  },
  {
   "id": "esim",
   "due": "2026-10-07",
   "dueLabel": "By 7 Oct",
   "title": "Buy and install a travel eSIM on Wi-Fi",
   "detail": "5 GB is plenty for four days. Keep your Turkish SIM on for bank codes, with its data roaming off.",
   "cost": "~$11–21"
  },
  {
   "id": "border",
   "due": "2026-10-01",
   "dueLabel": "1 Oct",
   "title": "Check the news: did Italy extend the Spain → Italy border checks past 1 Oct?",
   "detail": "ANSA or Il Post. Check the strike calendar too.",
   "links": [
    {
     "label": "Strike calendar",
     "url": "https://scioperi.mit.gov.it/mit2/public/scioperi"
    }
   ]
  },
  {
   "id": "bumble",
   "due": "2026-10-01",
   "dueLabel": "1 Oct",
   "title": "Optional: switch on Bumble Travel Mode (up to 7 days ahead)",
   "detail": "A Premium feature."
  },
  {
   "id": "arena10",
   "due": "2026-10-03",
   "dueLabel": "3 Oct",
   "title": "No Colosseum ticket yet? The Full Experience Arena for Sat 10 goes on sale",
   "detail": "Check just after midnight Rome time and again in the morning (one guide says slots appear from about 08:45). Check the strike calendar once more too: strikes need 10 days' notice, so it's final now.",
   "cost": "€24",
   "links": [
    {
     "label": "Full Experience Arena",
     "url": "https://colosseo.it/biglietti/full-experience-arena/"
    }
   ],
   "scene": {
    "scene": "colosseum",
    "tod": "day"
   }
  },
  {
   "id": "arena11",
   "due": "2026-10-04",
   "dueLabel": "4 Oct",
   "title": "The same release for Sun 11 (your backup day)",
   "cost": "€24",
   "links": [
    {
     "label": "colosseo.it",
     "url": "https://colosseo.it/biglietti/full-experience-arena/"
    }
   ]
  },
  {
   "id": "tinder",
   "due": "2026-10-04",
   "dueLabel": "4 Oct",
   "title": "Optional: set Tinder Passport to Rome",
   "detail": "A paid feature; a few days ahead is enough."
  },
  {
   "id": "pegcheck",
   "due": "2026-10-05",
   "dueLabel": "5 Oct",
   "title": "Pegasus online check-in opens at 14:50",
   "detail": "It opens 7 days before and closes 60 min before departure. Look at the first real weather forecast too.",
   "links": [
    {
     "label": "Pegasus check-in",
     "url": "https://www.flypgs.com/en/useful-info/info-about-flights/check-in"
    }
   ]
  },
  {
   "id": "recheck",
   "due": "2026-10-07",
   "dueLabel": "7 Oct",
   "title": "Re-check border news and strikes; RSVP Visionnaire; book the pub crawl",
   "detail": "The crawl has free cancellation up to 24 h before.",
   "links": [
    {
     "label": "Visionnaire RSVP",
     "url": "https://ra.co/events/2541153"
    },
    {
     "label": "Pub crawl",
     "url": "https://www.viator.com/tours/Rome/Romes-Ultimate-Party-aka-the-Spanish-Steps-Pub-Crawl/d511-348679P2"
    }
   ],
   "scene": {
    "scene": "club",
    "tod": "night"
   }
  },
  {
   "id": "wizz",
   "due": "2026-10-07",
   "dueLabel": "7 Oct",
   "title": "21:45: Wizz online check-in opens. Do it, then print the boarding pass",
   "detail": "It closes at 18:45 on Thu 8 Oct; after that the airport desk charges €40–50.",
   "links": [
    {
     "label": "Wizz check-in",
     "url": "https://www.wizzair.com/en-gb/help-centre/check-in-and-boarding/check-in/check-in-process"
    }
   ],
   "scene": {
    "scene": "plane",
    "tod": "night"
   }
  },
  {
   "id": "pantheon",
   "due": "2026-10-08",
   "dueLabel": "8 Oct",
   "title": "Pantheon slot for Fri 9 (and an optional online dome ticket)",
   "key": "Pantheon",
   "cost": "€7 · €17/€22",
   "links": [
    {
     "label": "Pantheon",
     "url": "https://direzionemuseiroma.cultura.gov.it/en/pantheon/"
    },
    {
     "label": "Dome",
     "url": "https://booking.basilicasanpietro.va/en/idea/52251275/-dome-with-stairs-includes-basilica-"
    }
   ],
   "scene": {
    "scene": "pantheon",
    "tod": "day"
   }
  },
  {
   "id": "lazio",
   "due": null,
   "dueLabel": "Later",
   "title": "Only if you'd give up the Borghese: Lazio–Monza, Sun 11 Oct, 15:00",
   "detail": "Tickets via sslazio.it → Vivaticket; sale dates weren't out on 28 Sep.",
   "links": [
    {
     "label": "sslazio.it",
     "url": "https://www.sslazio.it/en/biglietteria/matches"
    }
   ],
   "scene": {
    "scene": "stadium",
    "tod": "day"
   }
  }
 ],
 "bookingTips": [
  {
   "title": "If the Colosseum stays sold out",
   "icon": "landmark",
   "items": [
    {
     "icon": "clock",
     "text": "Check again around midnight Rome time: cancellations come back then."
    },
    {
     "icon": "ticket",
     "text": "The €24 Full Experience Arena ticket is also sold at the ticket office on the day."
    },
    {
     "icon": "users",
     "text": "Then: GetYourGuide entry from about €33 (free cancellation) or a guided tour for about €61–70."
    }
   ]
  },
  {
   "title": "If Vatican 08:00 is gone",
   "icon": "landmark",
   "items": [
    {
     "icon": "clock",
     "text": "Take the earliest slot and walk straight to the Sistine Chapel, or enter around 14:30–15:30 after the tour groups."
    },
    {
     "icon": "info",
     "text": "One site says cancellations reappear around 07:00 for the next day (unverified)."
    },
    {
     "icon": "users",
     "text": "Early-access tours cost about €75–110."
    }
   ]
  },
  {
   "title": "Buy only on official sites",
   "icon": "landmark",
   "items": [
    {
     "icon": "alert",
     "text": "Italy fined CoopCulture and six tour operators nearly €20 million over hoarding Colosseum tickets."
    },
    {
     "icon": "alert",
     "text": "Sites like “pantheonroma.com” are resellers. Ignore anyone selling “skip-the-line” tickets in the street or queue."
    },
    {
     "icon": "info",
     "text": "Skip the Roma Pass: €62.90 for 72 h, no Vatican, and its Colosseum and Borghese slots need booking 10+ days ahead."
    }
   ]
  }
 ],
 "packing": [
  "Passport with visa + the document folder (paper and phone)",
  "Two cards (Visa or Mastercard, not TROY-only) + €100–150 cash",
  "Wizz boarding pass, printed",
  "Travel insurance details and its 24/7 number",
  "Photos of passport and visa in the cloud + one paper copy",
  "eSIM installed and tested",
  "Padlock for the hostel locker",
  "Adapter: Schuko to Type L, or a small multi-plug",
  "Flip-flops, earplugs, eye mask",
  "Long trousers + T-shirt with sleeves for St Peter's (Fri 9)",
  "A going-out outfit: dark trousers, a shirt, clean shoes",
  "Comfortable walking shoes (20,000+ steps a day)",
  "Light rain jacket or small umbrella + a light sweater",
  "One power bank, max 100 Wh (cabin only, never used in flight)",
  "Liquids in 100 ml bottles in one clear 1-litre bag",
  "Reusable water bottle for the free nasoni fountains",
  "Small phone tripod + Bluetooth remote"
 ],
 "openDays": ["fri", "sat", "sun", "mon"],
 "places": [
  {
   "id": "sight-vatican-museums",
   "category": "sight",
   "name": "Vatican Museums",
   "text": "Last entry 18:00; 2026 Friday night openings unconfirmed",
   "price": "€25 online (€20 door)",
   "booking": "Yes",
   "open": [
    "o",
    "o",
    "c",
    "o"
   ],
   "scene": "spiral",
   "tod": "day",
   "place": {
    "name": "Vatican Museums",
    "lat": 41.9066,
    "lng": 12.4536,
    "query": "Vatican Museums, Rome"
   },
   "openNotes": [
    "08:00–20:00",
    "08:00–20:00",
    "Closed",
    "Open, no time"
   ],
   "top": true,
   "links": [
    {
     "label": "Official site",
     "url": "https://tickets.museivaticani.va"
    }
   ],
   "searchQuery": "Vatican Museums, Rome"
  },
  {
   "id": "sight-st-peter-s-basilica",
   "category": "sight",
   "name": "St Peter's Basilica",
   "text": "Official hours 07:00–20:00; others say 18:00 in October. Go before 17:00. Long trousers.",
   "price": "Free",
   "booking": "No",
   "open": [
    "o",
    "o",
    "o",
    "o"
   ],
   "scene": "stpeters",
   "tod": "day",
   "place": {
    "name": "St Peter's Basilica",
    "lat": 41.9022,
    "lng": 12.4539,
    "query": "St. Peter's Basilica"
   },
   "top": true,
   "links": [
    {
     "label": "Official site",
     "url": "https://www.basilicasanpietro.va/en/help/the-basilica"
    }
   ],
   "searchQuery": "St. Peter's Basilica"
  },
  {
   "id": "sight-st-peter-s-dome",
   "category": "sight",
   "name": "St Peter's dome",
   "text": "Last entry about 16:30",
   "price": "Kiosk €10/€15 · online €17/€22",
   "booking": "Optional",
   "open": [
    "o",
    "o",
    "o",
    "o"
   ],
   "scene": "skyline",
   "tod": "day",
   "place": null,
   "links": [
    {
     "label": "Official site",
     "url": "https://booking.basilicasanpietro.va/en/idea/52250633/-dome-with-lift-includes-basilica-"
    }
   ],
   "query": "St. Peter's Basilica dome view",
   "searchQuery": "St. Peter's Basilica dome view"
  },
  {
   "id": "sight-colosseum-forum-palatine-24h",
   "category": "sight",
   "name": "Colosseum + Forum + Palatine (24h)",
   "text": "08:30–18:30, last entry 17:30; Forum from 09:00. Named ticket: bring your passport.",
   "price": "€18",
   "booking": "Yes",
   "open": [
    "o",
    "o",
    "o",
    "o"
   ],
   "scene": "colosseum",
   "tod": "golden",
   "place": {
    "name": "Colosseum + Forum + Palatine (24h)",
    "lat": 41.8902,
    "lng": 12.4922,
    "query": "Colosseum, Rome"
   },
   "top": true,
   "links": [
    {
     "label": "Official site",
     "url": "https://ticketing.colosseo.it/en/"
    }
   ],
   "searchQuery": "Colosseum, Rome"
  },
  {
   "id": "sight-colosseum-full-experience",
   "category": "sight",
   "name": "Colosseum Full Experience",
   "text": "Arena ticket: online 7 days before, and at the ticket office on the day",
   "price": "€24 (€32 Underground + educational route)",
   "booking": "Yes",
   "open": [
    "o",
    "o",
    "o",
    "o"
   ],
   "scene": "colosseum",
   "tod": "day",
   "place": null,
   "links": [
    {
     "label": "Official site",
     "url": "https://colosseo.it/biglietti/full-experience-arena/"
    }
   ],
   "query": "Colosseum arena floor",
   "searchQuery": "Colosseum arena floor"
  },
  {
   "id": "sight-forum-pass-super-no-colosseum",
   "category": "sight",
   "name": "Forum Pass SUPER (no Colosseum)",
   "text": "The Forum rarely sells out",
   "price": "€18",
   "booking": "Optional",
   "open": [
    "o",
    "o",
    "o",
    "o"
   ],
   "scene": "forum",
   "tod": "day",
   "place": {
    "name": "Forum Pass SUPER (no Colosseum)",
    "lat": 41.8925,
    "lng": 12.4853,
    "query": "Roman Forum, Rome"
   },
   "links": [
    {
     "label": "Official site",
     "url": "https://colosseo.it/biglietti/forum-pass-super/"
    }
   ],
   "searchQuery": "Roman Forum, Rome"
  },
  {
   "id": "sight-colosseum-night-tour",
   "category": "sight",
   "name": "Colosseum night tour",
   "text": "Tuesdays and Thursdays only, so no tour on your full days",
   "price": "€50",
   "booking": "—",
   "open": [
    "n",
    "n",
    "n",
    "n"
   ],
   "scene": "colosseum",
   "tod": "night",
   "place": null,
   "links": [
    {
     "label": "Official site",
     "url": "https://colosseo.it/evento/una-notte-al-colosseo-2026/"
    }
   ],
   "query": "Colosseum at night",
   "searchQuery": "Colosseum at night"
  },
  {
   "id": "sight-borghese-gallery",
   "category": "sight",
   "name": "Borghese Gallery",
   "text": "09:00–19:00. Arrive 30 min early; non-refundable. Phone +39 06 32810.",
   "price": "about €13 (museum page and others: €18)",
   "booking": "Yes",
   "open": [
    "o",
    "o",
    "o",
    "c"
   ],
   "scene": "borghese",
   "tod": "day",
   "place": {
    "name": "Borghese Gallery",
    "lat": 41.9142,
    "lng": 12.4922,
    "query": "Galleria Borghese, Rome"
   },
   "top": true,
   "links": [
    {
     "label": "Official site",
     "url": "https://www.gebart.it/musei/galleria-borghese/"
    }
   ],
   "searchQuery": "Galleria Borghese, Rome"
  },
  {
   "id": "sight-pantheon",
   "category": "sight",
   "name": "Pantheon",
   "text": "09:00–19:00. Mass Sat 17:00 and Sun 10:30; sales stop an hour before.",
   "price": "€7",
   "booking": "Timed slot",
   "open": [
    "o",
    "o",
    "o",
    "o"
   ],
   "scene": "pantheon",
   "tod": "day",
   "place": {
    "name": "Pantheon",
    "lat": 41.8986,
    "lng": 12.4769,
    "query": "Pantheon, Rome"
   },
   "openNotes": [
    "",
    "Mass 17:00",
    "Mass 10:30",
    ""
   ],
   "top": true,
   "links": [
    {
     "label": "Official site",
     "url": "https://direzionemuseiroma.cultura.gov.it/en/pantheon/"
    }
   ],
   "searchQuery": "Pantheon, Rome"
  },
  {
   "id": "sight-trevi-fountain",
   "category": "sight",
   "name": "Trevi Fountain",
   "text": "Basin €2, card only: Fri from 11:30, Sat–Sun 09:00–22:00, Mon from 14:00 (maintenance day). Free and lit after 22:00.",
   "price": "Piazza free · basin €2",
   "booking": "At the gate",
   "open": [
    "o",
    "o",
    "o",
    "o"
   ],
   "scene": "trevi",
   "tod": "night",
   "place": {
    "name": "Trevi Fountain",
    "lat": 41.9009,
    "lng": 12.4833,
    "query": "Trevi Fountain, Rome"
   },
   "top": true,
   "links": [
    {
     "label": "Official site",
     "url": "https://fontanaditrevi.roma.it/en"
    }
   ],
   "searchQuery": "Trevi Fountain, Rome"
  },
  {
   "id": "sight-spanish-steps",
   "category": "sight",
   "name": "Spanish Steps",
   "text": "€250 fine for sitting",
   "price": "Free",
   "booking": "No",
   "open": [
    "o",
    "o",
    "o",
    "o"
   ],
   "scene": "steps",
   "tod": "dawn",
   "place": {
    "name": "Spanish Steps",
    "lat": 41.9058,
    "lng": 12.4826,
    "query": "Spanish Steps, Rome"
   },
   "searchQuery": "Spanish Steps, Rome"
  },
  {
   "id": "sight-castel-sant-angelo",
   "category": "sight",
   "name": "Castel Sant'Angelo",
   "text": "09:00–19:30, terrace included",
   "price": "€18",
   "booking": "Recommended",
   "open": [
    "o",
    "o",
    "o",
    "c"
   ],
   "scene": "castel",
   "tod": "day",
   "place": {
    "name": "Castel Sant'Angelo",
    "lat": 41.9031,
    "lng": 12.4663,
    "query": "Castel Sant'Angelo, Rome"
   },
   "top": true,
   "links": [
    {
     "label": "Official site",
     "url": "https://direzionemuseiroma.cultura.gov.it/en/museo-nazionale-di-castel-santangelo/"
    }
   ],
   "searchQuery": "Castel Sant'Angelo, Rome"
  },
  {
   "id": "sight-vittoriano-terrace-vive",
   "category": "sight",
   "name": "Vittoriano + terrace (VIVE)",
   "text": "09:30–19:30; last entry 18:45 or 19:00. Ticket valid 7 days.",
   "price": "€18",
   "booking": "Optional",
   "open": [
    "o",
    "o",
    "o",
    "o"
   ],
   "scene": "vittoriano",
   "tod": "sunset",
   "place": {
    "name": "Vittoriano + terrace (VIVE)",
    "lat": 41.8951,
    "lng": 12.4828,
    "query": "Vittoriano, Rome"
   },
   "top": true,
   "links": [
    {
     "label": "Official site",
     "url": "https://vive.midaticket.com/en/"
    }
   ],
   "searchQuery": "Vittoriano, Rome"
  },
  {
   "id": "sight-capitoline-museums",
   "category": "sight",
   "name": "Capitoline Museums",
   "text": "09:30–19:30, includes exhibitions",
   "price": "€16.50 (+€1 online)",
   "booking": "Optional",
   "open": [
    "o",
    "o",
    "o",
    "o"
   ],
   "scene": "capitoline",
   "tod": "day",
   "place": {
    "name": "Capitoline Museums",
    "lat": 41.8922,
    "lng": 12.483,
    "query": "Capitoline Museums, Rome"
   },
   "links": [
    {
     "label": "Official site",
     "url": "https://www.museicapitolini.org/en/informazioni_pratiche/biglietti_e_videoguide"
    }
   ],
   "searchQuery": "Capitoline Museums, Rome"
  },
  {
   "id": "sight-galleria-sciarra",
   "category": "sight",
   "name": "Galleria Sciarra",
   "text": "Weekdays 09:00–20:00 (hours vary)",
   "price": "Free",
   "booking": "No",
   "open": [
    "o",
    "c",
    "c",
    "o"
   ],
   "scene": "gallery",
   "tod": "day",
   "place": {
    "name": "Galleria Sciarra",
    "lat": 41.8998,
    "lng": 12.4812,
    "query": "Galleria Sciarra, Rome"
   },
   "links": [
    {
     "label": "Official site",
     "url": "https://www.turismoroma.it/en/places/galleria-sciarra"
    }
   ],
   "searchQuery": "Galleria Sciarra, Rome"
  },
  {
   "id": "sight-largo-argentina-walkway",
   "category": "sight",
   "name": "Largo Argentina walkway",
   "text": "09:30–19:00; entry every 20 min; cat shelter",
   "price": "€7",
   "booking": "On site",
   "open": [
    "o",
    "o",
    "o",
    "c"
   ],
   "scene": "argentina",
   "tod": "day",
   "place": {
    "name": "Largo Argentina walkway",
    "lat": 41.8955,
    "lng": 12.4768,
    "query": "Area Sacra di Largo Argentina, Rome"
   },
   "links": [
    {
     "label": "Official site",
     "url": "https://www.sovraintendenzaroma.it/i_luoghi/roma_antica/aree_archeologiche/area_sacra_di_largo_argentina"
    }
   ],
   "searchQuery": "Area Sacra di Largo Argentina, Rome"
  },
  {
   "id": "sight-galleria-doria-pamphilj",
   "category": "sight",
   "name": "Galleria Doria Pamphilj",
   "text": "10:00–20:00 (Mon 09:00–19:00); closed Wednesdays",
   "price": "€16 + €1",
   "booking": "Online",
   "open": [
    "o",
    "o",
    "o",
    "o"
   ],
   "scene": "gallery",
   "tod": "day",
   "place": {
    "name": "Galleria Doria Pamphilj",
    "lat": 41.898,
    "lng": 12.4812,
    "query": "Galleria Doria Pamphilj, Rome"
   },
   "links": [
    {
     "label": "Official site",
     "url": "https://www.imuseidiroma.it/galleria-doria-pamphilj/"
    }
   ],
   "searchQuery": "Galleria Doria Pamphilj, Rome"
  },
  {
   "id": "sight-galleria-spada",
   "category": "sight",
   "name": "Galleria Spada",
   "text": "08:30–19:30; Borromini's fake perspective; closed Tuesdays",
   "price": "€6",
   "booking": "Optional",
   "open": [
    "o",
    "o",
    "o",
    "o"
   ],
   "scene": "perspective",
   "tod": "day",
   "place": {
    "name": "Galleria Spada",
    "lat": 41.894,
    "lng": 12.4718,
    "query": "Galleria Spada Borromini perspective"
   },
   "links": [
    {
     "label": "Official site",
     "url": "https://direzionemuseiroma.cultura.gov.it/en/galleria-spada/"
    }
   ],
   "searchQuery": "Galleria Spada Borromini perspective"
  },
  {
   "id": "sight-domus-aurea",
   "category": "sight",
   "name": "Domus Aurea",
   "text": "Friday to Sunday only",
   "price": "€18 / €26 guided",
   "booking": "Yes",
   "open": [
    "o",
    "o",
    "o",
    "c"
   ],
   "scene": "ruins",
   "tod": "day",
   "place": {
    "name": "Domus Aurea",
    "lat": 41.8913,
    "lng": 12.495,
    "query": "Domus Aurea, Rome"
   },
   "links": [
    {
     "label": "Official site",
     "url": "https://colosseo.it/en/area/domus-aurea/"
    }
   ],
   "searchQuery": "Domus Aurea, Rome"
  },
  {
   "id": "sight-baths-of-caracalla",
   "category": "sight",
   "name": "Baths of Caracalla",
   "text": "09:00–19:00",
   "price": "€8",
   "booking": "Optional",
   "open": [
    "o",
    "o",
    "o",
    "c"
   ],
   "scene": "ruins",
   "tod": "golden",
   "place": {
    "name": "Baths of Caracalla",
    "lat": 41.879,
    "lng": 12.4924,
    "query": "Baths of Caracalla, Rome"
   },
   "links": [
    {
     "label": "Official site",
     "url": "https://cultura.gov.it/luogo/terme-di-caracalla"
    }
   ],
   "searchQuery": "Baths of Caracalla, Rome"
  },
  {
   "id": "sight-ostia-antica",
   "category": "sight",
   "name": "Ostia Antica",
   "text": "08:30–18:30; a half-day trip",
   "price": "€18",
   "booking": "Optional",
   "open": [
    "o",
    "o",
    "o",
    "c"
   ],
   "scene": "ruins",
   "tod": "day",
   "place": null,
   "links": [
    {
     "label": "Official site",
     "url": "https://www.imuseidiroma.it/parco-archeologico-di-ostia-antica/"
    }
   ],
   "query": "Ostia Antica",
   "searchQuery": "Ostia Antica"
  },
  {
   "id": "sight-san-callisto-catacombs",
   "category": "sight",
   "name": "San Callisto catacombs",
   "text": "09:00–12:00, 14:00–17:00; closed Wednesdays",
   "price": "€10",
   "booking": "Online",
   "open": [
    "o",
    "o",
    "o",
    "o"
   ],
   "scene": "catacomb",
   "tod": "day",
   "place": null,
   "links": [
    {
     "label": "Official site",
     "url": "https://www.catacombesancallisto.it/en/orari.php"
    }
   ],
   "query": "Catacombs of San Callisto, Rome",
   "searchQuery": "Catacombs of San Callisto, Rome"
  },
  {
   "id": "sight-domitilla-catacombs",
   "category": "sight",
   "name": "Domitilla catacombs",
   "text": "Guided visits; closed Tuesdays",
   "price": "€10",
   "booking": "Guided",
   "open": [
    "o",
    "o",
    "o",
    "o"
   ],
   "scene": "catacomb",
   "tod": "day",
   "place": null,
   "links": [
    {
     "label": "Official site",
     "url": "https://www.catacombedomitilla.it/en/"
    }
   ],
   "query": "Catacombs of Domitilla, Rome",
   "searchQuery": "Catacombs of Domitilla, Rome"
  },
  {
   "id": "sight-san-sebastiano-catacombs",
   "category": "sight",
   "name": "San Sebastiano catacombs",
   "text": "Guided visits; closed Sundays",
   "price": "from €8",
   "booking": "Guided",
   "open": [
    "o",
    "o",
    "c",
    "o"
   ],
   "scene": "catacomb",
   "tod": "day",
   "place": null,
   "query": "Catacombs of San Sebastiano, Rome",
   "searchQuery": "Catacombs of San Sebastiano, Rome"
  },
  {
   "id": "sight-priscilla-catacombs",
   "category": "sight",
   "name": "Priscilla catacombs",
   "text": "Guided visits; closed Mondays",
   "price": "from €10",
   "booking": "Guided",
   "open": [
    "o",
    "o",
    "o",
    "c"
   ],
   "scene": "catacomb",
   "tod": "day",
   "place": null,
   "query": "Catacombs of Priscilla, Rome",
   "searchQuery": "Catacombs of Priscilla, Rome"
  },
  {
   "id": "sight-san-clemente-underground-levels",
   "category": "sight",
   "name": "San Clemente (underground levels)",
   "text": "Sunday from 12:00 (undated source)",
   "price": "€10",
   "booking": "No",
   "open": [
    "o",
    "o",
    "o",
    "o"
   ],
   "scene": "church",
   "tod": "day",
   "place": {
    "name": "San Clemente (underground levels)",
    "lat": 41.8894,
    "lng": 12.4976,
    "query": "Basilica di San Clemente, Rome"
   },
   "openNotes": [
    "",
    "",
    "From 12:00",
    ""
   ],
   "searchQuery": "Basilica di San Clemente, Rome"
  },
  {
   "id": "sight-santa-maria-maggiore",
   "category": "sight",
   "name": "Santa Maria Maggiore",
   "text": "07:00–19:00; Pope Francis's tomb",
   "price": "Free",
   "booking": "No",
   "open": [
    "o",
    "o",
    "o",
    "o"
   ],
   "scene": "church",
   "tod": "day",
   "place": {
    "name": "Santa Maria Maggiore",
    "lat": 41.8976,
    "lng": 12.4984,
    "query": "Santa Maria Maggiore, Rome"
   },
   "searchQuery": "Santa Maria Maggiore, Rome"
  },
  {
   "id": "sight-st-john-lateran",
   "category": "sight",
   "name": "St John Lateran",
   "text": "07:00–18:30; the Holy Stairs are next door (climbed on your knees)",
   "price": "Free",
   "booking": "No",
   "open": [
    "o",
    "o",
    "o",
    "o"
   ],
   "scene": "church",
   "tod": "day",
   "place": {
    "name": "St John Lateran",
    "lat": 41.8859,
    "lng": 12.5057,
    "query": "Archbasilica of St John Lateran, Rome"
   },
   "searchQuery": "Archbasilica of St John Lateran, Rome"
  },
  {
   "id": "sight-tempietto-del-bramante",
   "category": "sight",
   "name": "Tempietto del Bramante",
   "text": "10:00–18:00",
   "price": "Free",
   "booking": "No",
   "open": [
    "o",
    "o",
    "o",
    "c"
   ],
   "scene": "tempietto",
   "tod": "day",
   "place": {
    "name": "Tempietto del Bramante",
    "lat": 41.8886,
    "lng": 12.4667,
    "query": "Tempietto del Bramante, Rome"
   },
   "links": [
    {
     "label": "Official site",
     "url": "https://www.accademiaspagna.org/"
    }
   ],
   "searchQuery": "Tempietto del Bramante, Rome"
  },
  {
   "id": "sight-aventine-keyhole",
   "category": "sight",
   "name": "Aventine Keyhole",
   "text": "Open 24 h; queues build in the day",
   "price": "Free",
   "booking": "No",
   "open": [
    "o",
    "o",
    "o",
    "o"
   ],
   "scene": "keyhole",
   "tod": "day",
   "place": {
    "name": "Aventine Keyhole",
    "lat": 41.8829,
    "lng": 12.4786,
    "query": "Aventine Keyhole, Piazza dei Cavalieri di Malta, Rome"
   },
   "searchQuery": "Aventine Keyhole, Piazza dei Cavalieri di Malta, Rome"
  },
  {
   "id": "sight-giardino-degli-aranci",
   "category": "sight",
   "name": "Giardino degli Aranci",
   "text": "07:00–18:00: closes before sunset",
   "price": "Free",
   "booking": "No",
   "open": [
    "o",
    "o",
    "o",
    "o"
   ],
   "scene": "skyline",
   "tod": "golden",
   "place": {
    "name": "Giardino degli Aranci",
    "lat": 41.885,
    "lng": 12.4796,
    "query": "Giardino degli Aranci, Rome"
   },
   "searchQuery": "Giardino degli Aranci, Rome"
  },
  {
   "id": "sight-villa-borghese-park-pincio",
   "category": "sight",
   "name": "Villa Borghese park + Pincio",
   "text": "Listed as open 24 h; rowing boats extra (price not verified)",
   "price": "Free",
   "booking": "No",
   "open": [
    "o",
    "o",
    "o",
    "o"
   ],
   "scene": "lake",
   "tod": "golden",
   "place": {
    "name": "Villa Borghese park + Pincio",
    "lat": 41.9115,
    "lng": 12.4784,
    "query": "Terrazza del Pincio, Rome"
   },
   "searchQuery": "Terrazza del Pincio, Rome"
  },
  {
   "id": "sight-porta-portese-flea-market",
   "category": "sight",
   "name": "Porta Portese flea market",
   "text": "Sundays only, 07:00–14:00; pickpockets",
   "price": "Free",
   "booking": "No",
   "open": [
    "c",
    "c",
    "o",
    "c"
   ],
   "scene": "market",
   "tod": "day",
   "place": {
    "name": "Porta Portese flea market",
    "lat": 41.8805,
    "lng": 12.4725,
    "query": "Porta Portese market, Rome"
   },
   "searchQuery": "Porta Portese market, Rome"
  },
  {
   "id": "sight-vatican-necropolis-scavi",
   "category": "sight",
   "name": "Vatican Necropolis (Scavi)",
   "text": "Confirmations take 2–5 months: out of reach. The Grottoes are free.",
   "price": "€20",
   "booking": "Request form",
   "open": [
    "o",
    "o",
    "c",
    "o"
   ],
   "scene": "catacomb",
   "tod": "day",
   "place": null,
   "links": [
    {
     "label": "Official site",
     "url": "https://www.basilicasanpietro.va/en/help/the-necropolis"
    }
   ],
   "query": "Vatican Necropolis",
   "searchQuery": "Vatican Necropolis"
  },
  {
   "id": "sight-appian-way",
   "category": "sight",
   "name": "Appian Way",
   "text": "The first 5 km are busy with cars; the catacombs above are in this area",
   "price": "Free",
   "booking": "No",
   "open": [
    "o",
    "o",
    "o",
    "o"
   ],
   "scene": "appia",
   "tod": "golden",
   "place": null,
   "query": "Via Appia Antica, Rome",
   "searchQuery": "Via Appia Antica, Rome"
  },
  {
   "id": "food-armando-al-pantheon",
   "category": "food",
   "name": "Armando al Pantheon",
   "text": "Rigatoni amatriciana, carbonara, saltimbocca; pork-free: spaghetti aglio, olio e peperoncino. Online booking only, 30 days ahead.",
   "area": "Centro",
   "where": "Pantheon",
   "verdict": "worth",
   "scene": "rigatoni",
   "tod": "day",
   "sunday": false,
   "place": {
    "name": "Armando al Pantheon",
    "lat": 41.8991,
    "lng": 12.4763,
    "query": "Armando al Pantheon, Rome"
   },
   "searchQuery": "Armando al Pantheon, Rome",
   "price": "~€30–45",
   "closed": "Sat dinner + all Sunday"
  },
  {
   "id": "food-da-enzo-al-29",
   "category": "food",
   "name": "Da Enzo al 29",
   "text": "No bookings: queue 30–60 min before 12:00 or 18:30 (1–2 h reported). Pasta €12–15; two courses with wine €20–40.",
   "area": "Trastevere",
   "where": "Via dei Vascellari 29",
   "verdict": "worth",
   "scene": "carbonara",
   "tod": "day",
   "sunday": false,
   "place": {
    "name": "Da Enzo al 29",
    "lat": 41.8883,
    "lng": 12.4768,
    "query": "Da Enzo al 29, Rome"
   },
   "searchQuery": "Da Enzo al 29, Rome",
   "price": "€20–40",
   "closed": "Sunday"
  },
  {
   "id": "food-la-tavernaccia-da-bruno",
   "category": "food",
   "name": "La Tavernaccia da Bruno",
   "text": "Eggplant parmigiana, oxtail, the famous Sunday lasagna. Book by phone or email.",
   "area": "Trastevere",
   "where": "By Trastevere station",
   "verdict": "worth",
   "scene": "lasagna",
   "tod": "day",
   "sunday": true,
   "place": {
    "name": "La Tavernaccia da Bruno",
    "lat": 41.8768,
    "lng": 12.469,
    "query": "La Tavernaccia da Bruno, Rome"
   },
   "searchQuery": "La Tavernaccia da Bruno, Rome",
   "price": "~€30–45",
   "closed": "Wed, Thu"
  },
  {
   "id": "food-cesare-al-casaletto",
   "category": "food",
   "name": "Cesare al Casaletto",
   "text": "A Roman classic worth the tram ride. Book online.",
   "area": "Trastevere",
   "where": "Monteverde, end of tram 8",
   "verdict": "worth",
   "scene": "carbonara",
   "tod": "day",
   "sunday": true,
   "place": {
    "name": "Cesare al Casaletto",
    "lat": 41.8739,
    "lng": 12.4466,
    "query": "Cesare al Casaletto, Rome"
   },
   "searchQuery": "Cesare al Casaletto, Rome",
   "closed": "Wednesday"
  },
  {
   "id": "food-flavio-al-velavevodetto",
   "category": "food",
   "name": "Flavio al Velavevodetto",
   "text": "Roman pastas in a room carved into Monte Testaccio. Book online or on 06 5744194.",
   "area": "Testaccio",
   "where": "Testaccio",
   "verdict": "worth",
   "scene": "rigatoni",
   "tod": "day",
   "sunday": true,
   "place": {
    "name": "Flavio al Velavevodetto",
    "lat": 41.8764,
    "lng": 12.4747,
    "query": "Flavio al Velavevodetto, Rome"
   },
   "searchQuery": "Flavio al Velavevodetto, Rome",
   "price": "€25–35 (2019)",
   "closed": "Open daily"
  },
  {
   "id": "food-felice-a-testaccio",
   "category": "food",
   "name": "Felice a Testaccio",
   "text": "Famous cacio e pepe. Book online. The grab-and-go Felice On The Go is near the Spanish Steps.",
   "area": "Testaccio",
   "where": "Testaccio",
   "verdict": "worth",
   "scene": "cacio",
   "tod": "day",
   "sunday": true,
   "place": {
    "name": "Felice a Testaccio",
    "lat": 41.8778,
    "lng": 12.475,
    "query": "Felice a Testaccio, Rome"
   },
   "searchQuery": "Felice a Testaccio, Rome",
   "closed": "Open daily"
  },
  {
   "id": "food-la-taverna-dei-fori-imperiali",
   "category": "food",
   "name": "La Taverna dei Fori Imperiali",
   "text": "Truffle cacio e pepe. Booking essential: 06 6798643.",
   "area": "Monti",
   "where": "Via della Madonna dei Monti",
   "verdict": "worth",
   "scene": "cacio",
   "tod": "day",
   "sunday": true,
   "place": {
    "name": "La Taverna dei Fori Imperiali",
    "lat": 41.894,
    "lng": 12.49,
    "query": "La Taverna dei Fori Imperiali, Rome"
   },
   "searchQuery": "La Taverna dei Fori Imperiali, Rome",
   "closed": "Tuesday"
  },
  {
   "id": "food-trattoria-monti",
   "category": "food",
   "name": "Trattoria Monti",
   "text": "About €50 without wine; book a day ahead.",
   "area": "Monti",
   "where": "Via di San Vito 13a",
   "verdict": "worth",
   "scene": "rigatoni",
   "tod": "day",
   "sunday": true,
   "place": {
    "name": "Trattoria Monti",
    "lat": 41.896,
    "lng": 12.501,
    "query": "Trattoria Monti, Rome"
   },
   "searchQuery": "Trattoria Monti, Rome",
   "price": "~€50",
   "closed": "Sunday evening"
  },
  {
   "id": "food-l-arcangelo",
   "category": "food",
   "name": "L'Arcangelo",
   "text": "In the Michelin Guide 2026. Dinner Monday–Saturday; +39 06 3210992.",
   "area": "Vatican",
   "where": "Prati",
   "verdict": "worth",
   "scene": "suppli",
   "tod": "day",
   "sunday": false,
   "place": {
    "name": "L'Arcangelo",
    "lat": 41.906,
    "lng": 12.47,
    "query": "L'Arcangelo, Rome"
   },
   "searchQuery": "L'Arcangelo, Rome",
   "price": "€€",
   "closed": "Sunday"
  },
  {
   "id": "food-bonci-pizzarium",
   "category": "food",
   "name": "Bonci Pizzarium",
   "text": "Pizza al taglio by weight, near the Vatican Museums. Opens 11:00 on Fridays; Sunday lunch only (12:00–15:00).",
   "area": "Vatican",
   "where": "Via della Meloria 43",
   "verdict": "worth",
   "scene": "taglio",
   "tod": "day",
   "sunday": true,
   "place": {
    "name": "Bonci Pizzarium",
    "lat": 41.9068,
    "lng": 12.4466,
    "query": "Pizzarium Bonci, Rome"
   },
   "searchQuery": "Pizzarium Bonci, Rome",
   "price": "~€10–15"
  },
  {
   "id": "food-mercato-di-testaccio",
   "category": "food",
   "name": "Mercato di Testaccio",
   "text": "Cheap, local and critic-backed. Mon–Sat 07:00–15:30.",
   "area": "Testaccio",
   "where": "Mordi e Vai; Da Corrado's 8-stool counter",
   "verdict": "worth",
   "scene": "panino",
   "tod": "day",
   "sunday": false,
   "place": {
    "name": "Mercato di Testaccio",
    "lat": 41.877,
    "lng": 12.4755,
    "query": "Mercato di Testaccio, Rome"
   },
   "searchQuery": "Mercato di Testaccio, Rome",
   "price": "cheap",
   "closed": "Sunday"
  },
  {
   "id": "food-mercato-centrale",
   "category": "food",
   "name": "Mercato Centrale",
   "text": "Food hall open daily 07:30–23:30: pasta €8–12, beer €4–6.",
   "area": "Termini",
   "where": "Inside Termini station",
   "verdict": "worth",
   "scene": "taglio",
   "tod": "day",
   "sunday": true,
   "place": {
    "name": "Mercato Centrale",
    "lat": 41.8998,
    "lng": 12.5022,
    "query": "Mercato Centrale Roma, Termini"
   },
   "searchQuery": "Mercato Centrale Roma, Termini",
   "price": "€2–12",
   "closed": "Open daily"
  },
  {
   "id": "food-antico-forno-roscioli",
   "category": "food",
   "name": "Antico Forno Roscioli",
   "text": "The bakery: pizza bianca and slices. Worth it and fast.",
   "area": "Centro",
   "where": "Campo de' Fiori",
   "verdict": "worth",
   "scene": "pizzabianca",
   "tod": "day",
   "sunday": null,
   "place": {
    "name": "Antico Forno Roscioli",
    "lat": 41.894,
    "lng": 12.4735,
    "query": "Antico Forno Roscioli, Rome"
   },
   "searchQuery": "Antico Forno Roscioli, Rome",
   "price": "cheap"
  },
  {
   "id": "food-two-sizes",
   "category": "food",
   "name": "Two Sizes",
   "text": "Tiramisù to go. Better than Pompi, say critics.",
   "area": "Centro",
   "where": "Via del Governo Vecchio 88",
   "verdict": "worth",
   "scene": "tiramisu",
   "tod": "day",
   "sunday": null,
   "place": {
    "name": "Two Sizes",
    "lat": 41.8985,
    "lng": 12.4705,
    "query": "Two Sizes, Rome"
   },
   "searchQuery": "Two Sizes, Rome",
   "price": "cheap"
  },
  {
   "id": "food-suppli-roma",
   "category": "food",
   "name": "Supplì Roma",
   "text": "Fried rice balls; ask about fillings if you avoid pork.",
   "area": "Trastevere",
   "where": "Trastevere",
   "verdict": "worth",
   "scene": "suppli",
   "tod": "day",
   "sunday": null,
   "place": {
    "name": "Supplì Roma",
    "lat": 41.8873,
    "lng": 12.4715,
    "query": "Supplì Roma, Trastevere"
   },
   "searchQuery": "Supplì Roma, Trastevere",
   "price": "€3–5"
  },
  {
   "id": "food-supplizio",
   "category": "food",
   "name": "Supplizio",
   "text": "Gourmet supplì.",
   "area": "Centro",
   "where": "Via dei Banchi Vecchi 143",
   "verdict": "worth",
   "scene": "suppli",
   "tod": "day",
   "sunday": null,
   "place": {
    "name": "Supplizio",
    "lat": 41.8985,
    "lng": 12.4675,
    "query": "Supplizio, Rome"
   },
   "searchQuery": "Supplizio, Rome",
   "price": "€3–5"
  },
  {
   "id": "food-trapizzino",
   "category": "food",
   "name": "Trapizzino",
   "text": "Pizza pockets; the chicken cacciatore is pork-free.",
   "area": "Trastevere",
   "where": "Piazza Trilussa 46 (also Testaccio, Mercato Centrale)",
   "verdict": "worth",
   "scene": "trapizzino",
   "tod": "day",
   "sunday": null,
   "place": {
    "name": "Trapizzino",
    "lat": 41.8918,
    "lng": 12.4696,
    "query": "Trapizzino, Piazza Trilussa 46, Rome"
   },
   "searchQuery": "Trapizzino, Piazza Trilussa 46, Rome",
   "price": "€5–7"
  },
  {
   "id": "food-pastificio-guerra",
   "category": "food",
   "name": "Pastificio Guerra",
   "text": "€5 pasta at a standing counter: a cheap lunch.",
   "area": "Centro",
   "where": "Via della Croce 8, Spanish Steps",
   "verdict": "worth",
   "scene": "cacio",
   "tod": "day",
   "sunday": null,
   "place": {
    "name": "Pastificio Guerra",
    "lat": 41.9062,
    "lng": 12.48,
    "query": "Pastificio Guerra, Rome"
   },
   "searchQuery": "Pastificio Guerra, Rome",
   "price": "€5"
  },
  {
   "id": "food-sant-eustachio-il-caffe",
   "category": "food",
   "name": "Sant'Eustachio il Caffè",
   "text": "Worth it at the bar only; tables are pricey.",
   "area": "Centro",
   "where": "By the Pantheon",
   "verdict": "worth",
   "scene": "espresso",
   "tod": "day",
   "sunday": null,
   "place": {
    "name": "Sant'Eustachio il Caffè",
    "lat": 41.8983,
    "lng": 12.4751,
    "query": "Sant'Eustachio il Caffè, Rome"
   },
   "searchQuery": "Sant'Eustachio il Caffè, Rome",
   "price": "€1.20–1.50"
  },
  {
   "id": "food-seu-pizza",
   "category": "food",
   "name": "Seu Pizza",
   "text": "Modern pizza. Reopened 30 Oct 2025 with tasting menus (€70, book) plus à-la-carte pizza.",
   "area": "Trastevere",
   "where": "Via Angelo Bargoni",
   "verdict": "worth",
   "scene": "tonda",
   "tod": "day",
   "sunday": null,
   "place": null,
   "searchQuery": "Seu Pizza, Rome",
   "price": "€70 menu"
  },
  {
   "id": "food-salumeria-roscioli",
   "category": "food",
   "name": "Salumeria Roscioli",
   "text": "Open Sunday; €20 no-show fee. Some critics say quality slipped after a chef change.",
   "area": "Centro",
   "where": "Campo de' Fiori",
   "verdict": "split",
   "scene": "carbonara",
   "tod": "day",
   "sunday": true,
   "place": {
    "name": "Salumeria Roscioli",
    "lat": 41.8941,
    "lng": 12.4731,
    "query": "Salumeria Roscioli, Rome"
   },
   "searchQuery": "Salumeria Roscioli, Rome"
  },
  {
   "id": "food-giolitti",
   "category": "food",
   "name": "Giolitti",
   "text": "Some rank it #1 for gelato; others call it chaotic.",
   "area": "Centro",
   "where": "Near the Pantheon",
   "verdict": "split",
   "scene": "gelato",
   "tod": "day",
   "sunday": null,
   "place": {
    "name": "Giolitti",
    "lat": 41.9008,
    "lng": 12.4775,
    "query": "Giolitti, Rome"
   },
   "searchQuery": "Giolitti, Rome"
  },
  {
   "id": "food-pompi",
   "category": "food",
   "name": "Pompi",
   "text": "“Good but overrated”: go to Two Sizes instead.",
   "area": "Centro",
   "where": "Several branches",
   "verdict": "over",
   "scene": "tiramisu",
   "tod": "day",
   "sunday": null,
   "place": null,
   "searchQuery": "Pompi tiramisù, Rome"
  },
  {
   "id": "food-osteria-da-fortunata",
   "category": "food",
   "name": "Osteria da Fortunata",
   "text": "The pasta-making show is more memorable than the meal.",
   "area": "Centro",
   "where": "Campo de' Fiori area",
   "verdict": "over",
   "scene": "cacio",
   "tod": "day",
   "sunday": null,
   "place": {
    "name": "Osteria da Fortunata",
    "lat": 41.8957,
    "lng": 12.4712,
    "query": "Osteria da Fortunata, Rome"
   },
   "searchQuery": "Osteria da Fortunata, Rome"
  },
  {
   "id": "food-tonnarello",
   "category": "food",
   "name": "Tonnarello",
   "text": "A tourist trap per The Infatuation, though some bloggers like it. Same verdict for Al Moro and La Campana.",
   "area": "Trastevere",
   "where": "Trastevere",
   "verdict": "trap",
   "scene": "rigatoni",
   "tod": "day",
   "sunday": null,
   "place": {
    "name": "Tonnarello",
    "lat": 41.8895,
    "lng": 12.4695,
    "query": "Tonnarello, Rome"
   },
   "searchQuery": "Tonnarello, Rome"
  },
  {
   "id": "food-antico-caffe-greco",
   "category": "food",
   "name": "Antico Caffè Greco",
   "text": "Closed since October 2025 after an eviction; no confirmed reopening.",
   "area": "Centro",
   "where": "Via Condotti",
   "verdict": "closed",
   "scene": "espresso",
   "tod": "day",
   "sunday": false,
   "place": {
    "name": "Antico Caffè Greco",
    "lat": 41.9054,
    "lng": 12.481,
    "query": "Antico Caffè Greco, Rome"
   },
   "searchQuery": "Antico Caffè Greco, Rome",
   "closed": "Closed"
  },
  {
   "id": "food-gelato-otaleg-fatamorgana-gracchi-fassi",
   "category": "food",
   "name": "Gelato: Otaleg, Fatamorgana, Gracchi, Fassi",
   "text": "Real gelato. Avoid tall neon mountains; real pistachio is olive-brown.",
   "area": "Centro",
   "where": "Across the city; Fassi near Termini",
   "verdict": "worth",
   "scene": "gelato",
   "tod": "day",
   "sunday": null,
   "place": null,
   "searchQuery": "Fatamorgana gelato, Rome",
   "price": "€3–5"
  },
  {
   "id": "food-pasticceria-regoli",
   "category": "food",
   "name": "Pasticceria Regoli",
   "text": "The maritozzo cream bun. Opens about 06:30–07:00 and sells out before noon.",
   "area": "Termini",
   "where": "Near Termini",
   "verdict": "worth",
   "scene": "maritozzo",
   "tod": "day",
   "sunday": null,
   "place": {
    "name": "Pasticceria Regoli",
    "lat": 41.895,
    "lng": 12.506,
    "query": "Pasticceria Regoli, Rome"
   },
   "searchQuery": "Pasticceria Regoli, Rome",
   "price": "cheap"
  },
  {
   "id": "photo-trevi-fountain",
   "category": "photo",
   "name": "Trevi Fountain",
   "text": "Full fountain, you at the basin",
   "bestTime": "06:35–07:15, or after 22:00 (lit)",
   "price": "Piazza free",
   "scene": "trevi",
   "tod": "dawn",
   "place": {
    "name": "Trevi Fountain",
    "lat": 41.9009,
    "lng": 12.4833,
    "query": "Trevi Fountain, Rome"
   },
   "searchQuery": "Trevi Fountain, Rome"
  },
  {
   "id": "photo-largo-gaetana-agnesi-via-nicola-salvi-wall",
   "category": "photo",
   "name": "Largo Gaetana Agnesi / Via Nicola Salvi wall",
   "text": "The postcard Colosseum from above",
   "bestTime": "06:45–08:15 or blue hour",
   "price": "Free",
   "scene": "colosseum",
   "tod": "blue",
   "place": {
    "name": "Largo Gaetana Agnesi / Via Nicola Salvi wall",
    "lat": 41.8918,
    "lng": 12.495,
    "query": "Largo Gaetana Agnesi, Rome"
   },
   "searchQuery": "Largo Gaetana Agnesi, Rome"
  },
  {
   "id": "photo-vittoriano-terrace",
   "category": "photo",
   "name": "Vittoriano terrace",
   "text": "360°: the warm Forum one way, sunset near St Peter's the other",
   "bestTime": "On top by 18:15; closes 19:30",
   "price": "€18",
   "scene": "vittoriano",
   "tod": "sunset",
   "place": {
    "name": "Vittoriano terrace",
    "lat": 41.8951,
    "lng": 12.4828,
    "query": "Terrazza delle Quadrighe, Vittoriano, Rome"
   },
   "searchQuery": "Terrazza delle Quadrighe, Vittoriano, Rome"
  },
  {
   "id": "photo-capitoline-terrace",
   "category": "photo",
   "name": "Capitoline terrace",
   "text": "Forum panorama, behind Palazzo Senatorio",
   "bestTime": "17:15–18:35",
   "price": "Free",
   "scene": "forum",
   "tod": "golden",
   "place": {
    "name": "Capitoline terrace",
    "lat": 41.8922,
    "lng": 12.483,
    "query": "Via di Monte Tarpeo, Rome"
   },
   "searchQuery": "Via di Monte Tarpeo, Rome"
  },
  {
   "id": "photo-spanish-steps",
   "category": "photo",
   "name": "Spanish Steps",
   "text": "Empty steps",
   "bestTime": "07:05–07:40",
   "price": "Free",
   "scene": "steps",
   "tod": "dawn",
   "place": {
    "name": "Spanish Steps",
    "lat": 41.9058,
    "lng": 12.4826,
    "query": "Spanish Steps, Rome"
   },
   "searchQuery": "Spanish Steps, Rome"
  },
  {
   "id": "photo-piazza-navona",
   "category": "photo",
   "name": "Piazza Navona",
   "text": "Four Rivers fountain",
   "bestTime": "08:00–08:45",
   "price": "Free",
   "scene": "navona",
   "tod": "day",
   "place": {
    "name": "Piazza Navona",
    "lat": 41.8992,
    "lng": 12.4731,
    "query": "Piazza Navona, Rome"
   },
   "searchQuery": "Piazza Navona, Rome"
  },
  {
   "id": "photo-pantheon",
   "category": "photo",
   "name": "Pantheon",
   "text": "Empty portico; the oculus sun disc inside",
   "bestTime": "Outside 07:40–08:15; inside 12:15–13:30 if sunny",
   "price": "€7 inside",
   "scene": "pantheon",
   "tod": "dawn",
   "place": {
    "name": "Pantheon",
    "lat": 41.8986,
    "lng": 12.4769,
    "query": "Pantheon, Rome"
   },
   "searchQuery": "Pantheon, Rome"
  },
  {
   "id": "photo-via-della-conciliazione",
   "category": "photo",
   "name": "Via della Conciliazione",
   "text": "St Peter's in first sun",
   "bestTime": "07:15–08:00",
   "price": "Free",
   "scene": "stpeters",
   "tod": "dawn",
   "place": {
    "name": "Via della Conciliazione",
    "lat": 41.902,
    "lng": 12.461,
    "query": "Via della Conciliazione, Rome"
   },
   "searchQuery": "Via della Conciliazione, Rome"
  },
  {
   "id": "photo-ponte-sant-angelo-river-steps",
   "category": "photo",
   "name": "Ponte Sant'Angelo + river steps",
   "text": "Angels and the castle",
   "bestTime": "Blue hour or ~08:45",
   "price": "Free",
   "scene": "castel",
   "tod": "blue",
   "place": {
    "name": "Ponte Sant'Angelo + river steps",
    "lat": 41.9015,
    "lng": 12.4665,
    "query": "Ponte Sant'Angelo, Rome"
   },
   "searchQuery": "Ponte Sant'Angelo, Rome"
  },
  {
   "id": "photo-ponte-umberto-i",
   "category": "photo",
   "name": "Ponte Umberto I",
   "text": "The dome with the sun setting beside it",
   "bestTime": "18:10–18:40",
   "price": "Free",
   "scene": "skyline",
   "tod": "sunset",
   "place": {
    "name": "Ponte Umberto I",
    "lat": 41.9025,
    "lng": 12.4705,
    "query": "Ponte Umberto I, Rome"
   },
   "searchQuery": "Ponte Umberto I, Rome"
  },
  {
   "id": "photo-pincio-terrace",
   "category": "photo",
   "name": "Pincio terrace",
   "text": "Piazza del Popolo from above",
   "bestTime": "18:00–18:40",
   "price": "Free",
   "scene": "skyline",
   "tod": "golden",
   "place": {
    "name": "Pincio terrace",
    "lat": 41.9115,
    "lng": 12.4784,
    "query": "Terrazza del Pincio, Rome"
   },
   "searchQuery": "Terrazza del Pincio, Rome"
  },
  {
   "id": "photo-gianicolo-terrace",
   "category": "photo",
   "name": "Gianicolo terrace",
   "text": "The domes, then the city lights",
   "bestTime": "17:45–19:10",
   "price": "Free",
   "scene": "skyline",
   "tod": "blue",
   "place": {
    "name": "Gianicolo terrace",
    "lat": 41.8916,
    "lng": 12.4613,
    "query": "Terrazza del Gianicolo, Rome"
   },
   "searchQuery": "Terrazza del Gianicolo, Rome"
  },
  {
   "id": "photo-trastevere-lanes",
   "category": "photo",
   "name": "Trastevere lanes",
   "text": "Ivy and lanterns: Vicolo del Cedro, Vicolo della Torre, Vicolo Moroni",
   "bestTime": "07:30–09:00 or 19:00–21:00",
   "price": "Free",
   "scene": "alley",
   "tod": "night",
   "place": {
    "name": "Trastevere lanes",
    "lat": 41.8905,
    "lng": 12.468,
    "query": "Vicolo del Cedro, Rome"
   },
   "searchQuery": "Vicolo del Cedro, Rome"
  },
  {
   "id": "photo-aventine-keyhole",
   "category": "photo",
   "name": "Aventine Keyhole",
   "text": "St Peter's dome through a keyhole",
   "bestTime": "06:50–07:30 or after 21:00",
   "price": "Free",
   "scene": "keyhole",
   "tod": "day",
   "place": {
    "name": "Aventine Keyhole",
    "lat": 41.8829,
    "lng": 12.4786,
    "query": "Aventine Keyhole, Rome"
   },
   "searchQuery": "Aventine Keyhole, Rome"
  },
  {
   "id": "photo-giardino-degli-aranci",
   "category": "photo",
   "name": "Giardino degli Aranci",
   "text": "Pines and domes (closes 18:00)",
   "bestTime": "07:00–08:00 or 17:00–17:55",
   "price": "Free",
   "scene": "skyline",
   "tod": "golden",
   "place": {
    "name": "Giardino degli Aranci",
    "lat": 41.885,
    "lng": 12.4796,
    "query": "Giardino degli Aranci, Rome"
   },
   "searchQuery": "Giardino degli Aranci, Rome"
  },
  {
   "id": "photo-momo-staircase",
   "category": "photo",
   "name": "Momo staircase",
   "text": "The spiral from above, at the Vatican Museums exit",
   "bestTime": "During your visit",
   "price": "Ticket",
   "scene": "spiral",
   "tod": "day",
   "place": {
    "name": "Momo staircase",
    "lat": 41.9066,
    "lng": 12.4536,
    "query": "Vatican Museums spiral staircase"
   },
   "searchQuery": "Vatican Museums spiral staircase"
  },
  {
   "id": "photo-galleria-sciarra",
   "category": "photo",
   "name": "Galleria Sciarra",
   "text": "Frescoed courtyard",
   "bestTime": "Weekdays",
   "price": "Free",
   "scene": "gallery",
   "tod": "day",
   "place": {
    "name": "Galleria Sciarra",
    "lat": 41.8998,
    "lng": 12.4812,
    "query": "Galleria Sciarra, Rome"
   },
   "searchQuery": "Galleria Sciarra, Rome"
  },
  {
   "id": "photo-galleria-spada",
   "category": "photo",
   "name": "Galleria Spada",
   "text": "Borromini's fake perspective (closed Tuesdays)",
   "bestTime": "Opening hours",
   "price": "€6",
   "scene": "perspective",
   "tod": "day",
   "place": {
    "name": "Galleria Spada",
    "lat": 41.894,
    "lng": 12.4718,
    "query": "Galleria Spada, Rome"
   },
   "searchQuery": "Galleria Spada, Rome"
  }
 ],
 "dishes": [
  {
   "name": "Cacio e pepe",
   "sub": "Pecorino + black pepper",
   "pork": "No pork",
   "where": "Osteria La Quercia; Felice a Testaccio; Taverna dei Fori (with truffle)",
   "scene": "cacio"
  },
  {
   "name": "Carbonara / amatriciana / gricia",
   "sub": "Rome's other three pastas",
   "pork": "Pork (guanciale)",
   "where": "Armando, Da Enzo al 29, Flavio, Cesare al Casaletto",
   "scene": "carbonara"
  },
  {
   "name": "Supplì",
   "sub": "Fried rice ball, €3–5",
   "pork": "Ask",
   "where": "Supplì Roma (Trastevere), Supplizio (Via dei Banchi Vecchi 143)",
   "scene": "suppli"
  },
  {
   "name": "Pizza al taglio",
   "sub": "Sold by weight",
   "pork": "Rossa, marinara, potato: no pork",
   "where": "Bonci Pizzarium, Antico Forno Roscioli, Forno Campo de' Fiori",
   "scene": "taglio"
  },
  {
   "name": "Trapizzino",
   "sub": "Pizza pocket, €5–7",
   "pork": "Chicken cacciatore: no pork",
   "where": "Piazza Trilussa 46, Testaccio, Mercato Centrale",
   "scene": "trapizzino"
  },
  {
   "name": "Coda alla vaccinara",
   "sub": "Oxtail stew",
   "pork": "No pork (ask)",
   "where": "La Tavernaccia, Cesare al Pellegrino",
   "scene": "lasagna"
  },
  {
   "name": "Maritozzo",
   "sub": "Cream bun",
   "pork": "No pork",
   "where": "Pasticceria Regoli near Termini (opens ~06:30–07:00, sells out before noon)",
   "scene": "maritozzo"
  },
  {
   "name": "Tiramisù",
   "sub": "",
   "pork": "No pork",
   "where": "Two Sizes, Via del Governo Vecchio 88",
   "scene": "tiramisu"
  },
  {
   "name": "Gelato",
   "sub": "",
   "pork": "No pork",
   "where": "Otaleg, Fatamorgana, Gracchi, Fassi (near Termini)",
   "scene": "gelato"
  }
 ],
 "info": [
  {
   "id": "nights",
   "title": "Nights & people",
   "subtitle": "Clubs, crawls, meeting people, dating, getting home",
   "icon": "glass",
   "blocks": [
    {
     "t": "p",
     "text": "Your base is YellowSquare, voted Best Hostel in Italy at Hostelworld's 2026 awards, with a party or concert every night. Here is everything else."
    },
    {
     "t": "p",
     "text": "### How a Roman night works"
    },
    {
     "t": "special",
     "kind": "nightChart"
    },
    {
     "t": "p",
     "text": "A club at 23:00 is empty. Italians drink socially rather than to get drunk, and being very drunk hurts your chances with locals."
    },
    {
     "t": "p",
     "text": "### Clubs on your nights"
    },
    {
     "t": "table",
     "head": [
      "Night",
      "Club",
      "Music",
      "Price",
      "Hours"
     ],
     "rows": [
      [
       "Fri 9",
       "**Juno World** @ Lanificio 159, Via di Pietralata 159A (far: taxi) · [RA](https://ra.co/events/2536929)",
       "techno / house",
       "€15",
       "22:00–05:00"
      ],
      [
       "Fri 9",
       "**UPNEO** @ NEO Club, Via degli Argonauti 18 · [RA](https://ra.co/events/2541344)",
       "house",
       "€20",
       "23:00–05:00"
      ],
      [
       "Fri 9",
       "Piper “Lady Flex” / Muccassassina @ Qube",
       "hip-hop, reggaeton, R&B / LGBTQ+ party",
       "€15–20 / from €18",
       "unconfirmed for Oct 2026"
      ],
      [
       "Sat 10",
       "**Visionnaire**, Via di Monte Testaccio 67 · [RSVP on RA](https://ra.co/events/2541153)",
       "CONFUSION x MADFROG",
       "free RSVP, else €10 before 01:00 / €15 after",
       "23:00–04:00"
      ],
      [
       "Sat 10",
       "**Circolo degli Illuminati**, Via G. Libetta 1 · [RA](https://ra.co/events/2547455)",
       "MINÛ: Krol, house / minimal",
       "€10",
       "23:00–06:00"
      ],
      [
       "Sat 10",
       "Piper “Babylonia” / Spazio Novecento, EUR",
       "commercial / techno to EDM",
       "€15–20",
       "unconfirmed for Oct 2026"
      ],
      [
       "Sun 11",
       "No Resident Advisor events",
       "—",
       "—",
       "keep it light"
      ]
     ]
    },
    {
     "t": "callout",
     "title": "Door policy",
     "text": "All Resident Advisor events are 21+, so bring your passport. RSVP or text for the list in the afternoon. Commercial clubs can be strict with groups of men or solo men: go with a mixed hostel or crawl group and dress smart casual. Techno clubs are more relaxed. (General Italian practice, not venue-confirmed.)",
     "tone": "gold"
    },
    {
     "t": "p",
     "text": "### Pub crawls and free walking tours"
    },
    {
     "t": "p",
     "text": "A Lonely Planet article lists pub crawls among Rome's banned activities, yet these still run nightly with 2026 reviews. Follow the guide, keep the noise down in the street, and don't carry glass between bars."
    },
    {
     "t": "table",
     "head": [
      "Free tour (tip €10–20)",
      "Meeting point",
      "Times"
     ],
     "rows": [
      [
       "**Best Euro Tours “Rome Central”** (4.99/5, 6,793 reviews)",
       "Piazza di S. Marco 48, by Piazza Venezia; green “CITY WALKING TOUR” sign",
       "10:00, 11:00 + more"
      ],
      [
       "**What About Tours** city centre",
       "Foro Traiano 89, church steps near Trajan's Column",
       "11:00, 17:00"
      ],
      [
       "**What About Tours** Colosseum / Ghetto & Trastevere",
       "on booking",
       "10:00, 18:30 / 10:30, 14:30"
      ],
      [
       "**What About Tours** ghost tour",
       "on booking",
       "20:00"
      ]
     ]
    },
    {
     "t": "p",
     "text": "Days vary: check the live calendar on [GuruWalk](https://www.guruwalk.com/rome) or [Freetour.com](https://www.freetour.com/rome). GuruWalk suggests €15–50."
    },
    {
     "t": "p",
     "text": "### Your social toolkit"
    },
    {
     "t": "list",
     "items": [
      "**Hostel events:** YellowSquare's nightly party and free strolls. Sit at the bar and say hi.",
      "**Hostelworld City Chat + Linkups:** open from 14 days before arrival. Post “Anyone for the Vatican at 8 on Friday?” · [Linkups](https://www.hostelworld.com/linkups)",
      "**Food tour:** Eating Europe's Twilight Trastevere (€94, max 12) is dinner plus a ready-made group.",
      "**Tablo:** an Italian app to join strangers at a restaurant table, for friends rather than dating.",
      "**Language exchanges** mostly fall Monday–Wednesday. Pignetismi in Pigneto listed a Thursday speaking club and a Sunday social breakfast earlier in the year; check Eventbrite a week before."
     ]
    },
    {
     "t": "p",
     "text": "### Dating apps as a visitor"
    },
    {
     "t": "list",
     "items": [
      "**Tinder Passport** (paid, or in Plus/Gold/Platinum): set Rome a few days before.",
      "**Bumble Travel Mode** (Premium): up to 7 days before. Since Aug 2026, men can message first.",
      "**Hinge** is free.",
      "**First date:** aperitivo 19:00–21:00 at a busy bar you choose, like Freni e Frizioni or a Monti wine bar."
     ]
    },
    {
     "t": "callout",
     "title": "Profile bio you can copy",
     "text": "Visiting Rome 8–12 Oct from Türkiye. Looking for aperitivo and someone to show me their Rome.",
     "tone": "gold"
    },
    {
     "t": "p",
     "text": "Putting your dates in the profile screens for people happy to meet a visitor, and a few Italian words improve your matches. Travellers at your hostel are often the most open to meeting up. Italian norms: people often meet through friends and at aperitivo; the man traditionally makes the first move, offers to pay and holds the door; be on time; greet with two cheek kisses; skip politics and religion; things move slowly."
    },
    {
     "t": "callout",
     "title": "Respect and consent",
     "text": "Meet people in social settings and keep it conversational. Take the first “no” gracefully. No touching, following, catcalling, or repeatedly asking for a number or Instagram. Consent must be clear, enthusiastic and ongoing; someone very drunk can't consent. Italy's parliament is still rewriting its consent law, so the safe standard is a clear yes.",
     "tone": "accent"
    },
    {
     "t": "callout",
     "title": "App red flags",
     "text": "Someone who moves you to WhatsApp immediately, asks for money, gift cards or crypto, or insists on one particular bar and orders pricey drinks. Never send money, and pick the bar yourself.",
     "tone": "gold"
    },
    {
     "t": "p",
     "text": "### Where to go out"
    },
    {
     "t": "table",
     "head": [
      "Area",
      "Vibe",
      "Prices"
     ],
     "rows": [
      [
       "**Trastevere**",
       "Most social: locals, students, backpackers; Piazza Trilussa steps",
       "cocktails €8–12; beer €5–7"
      ],
      [
       "**Campo de' Fiori**",
       "Pubs, tourists, crawls",
       "—"
      ],
      [
       "**Monti**",
       "Cocktail and date bars, 30+",
       "cocktails €12–16"
      ],
      [
       "**San Lorenzo**",
       "Cheap student area (red zone: stay on busy streets)",
       "€4–7"
      ],
      [
       "**Pigneto**",
       "Local, alternative",
       "€6–9"
      ],
      [
       "**Testaccio / Ostiense**",
       "Clubs",
       "entry €10–30"
      ]
     ]
    },
    {
     "t": "list",
     "items": [
      "**Bar San Calisto** (€3 Peroni, €5 spritz, to 02:00) · **Freni e Frizioni**, Via del Politeama 4 (#31 in Europe's 50 Best Bars 2026) · **Ma Che Siete Venuti a Fà** (craft beer)",
      "**Il Goccetto** and **Il Vinaietto** (street-party wine bars) · **Scholars Lounge**, Via del Plebiscito 101b (karaoke, to 03:30) · **Drink Kong** (€15+ cocktails)",
      "Skip Jerry Thomas (members and password only). Goa Club is closed."
     ]
    },
    {
     "t": "callout",
     "title": "Getting home",
     "text": "Metro until about 01:30 on Fri and Sat; then night buses nMA/nMB (30–40+ min apart) or an official taxi via FreeNow or 060609 (night start €7.50; centre–Testaccio about €15–20). Never an unmarked car. Agree a meeting point, keep your phone charged, and save “YellowSquare, Via Palestro 51”.",
     "tone": "gold"
    },
    {
     "t": "p",
     "text": "### Also this weekend"
    },
    {
     "t": "list",
     "items": [
      "**Giornate FAI d'Autunno, Sat 10–Sun 11 Oct:** normally closed buildings open for a free donation; the list wasn't out on 28 Sep.",
      "**EurHop! craft beer festival, 9–11 Oct**, EUR: 800 beers. **Quartiere Vino Pigneto** wine festival, Sat 10 Oct, €20 pass.",
      "**Tevere Day** flower tribute on six bridges including Ponte Sant'Angelo, Sat 10 Oct 11:00–13:00 (busy bridges).",
      "**Omar Souleyman** concert, Fri 9 Oct. The Rome Film Fest starts 13 Oct, after you leave."
     ]
    }
   ]
  },
  {
   "id": "food",
   "title": "Food tips",
   "subtitle": "Dishes, coffee rules, rooftops, traps, budget",
   "icon": "food",
   "blocks": [
    {
     "t": "p",
     "text": "### Must-try dishes"
    },
    {
     "t": "p",
     "text": "**Pork note:** of Rome's four famous pastas, only cacio e pepe is pork-free. Carbonara, amatriciana and gricia use guanciale (cured pork cheek); saltimbocca and porchetta are pork too. Ask “C'è maiale?”, or eat kosher in the Jewish Ghetto."
    },
    {
     "t": "special",
     "kind": "dishes"
    },
    {
     "t": "p",
     "text": "### Coffee, aperitivo and tipping"
    },
    {
     "t": "list",
     "items": [
      "**Stand at the bar:** table service costs 2–3× more. Pay at the till, then hand the receipt to the barista. Espresso €1.20–1.50; latte €2.50–3.50, or €7 at the Spanish Steps.",
      "Cappuccino is a morning drink: a custom, not a rule.",
      "**Aperitivo 19:00–21:00:** €5 spritz at Bar San Calisto or Necci; €12–16 on rooftops near Termini and Monti."
     ]
    },
    {
     "t": "list",
     "items": [
      "**Tipping isn't expected.** Round up for great table service.",
      "**Read the bill:** coperto (cover charge) is legal and normal. Servizio, bread and water can appear unasked. Say “acqua del rubinetto” for tap water. Fish “per etto” means per 100 g: ask for the total first.",
      "Ask for “il conto dettagliato” (itemised bill). If you're blocked from leaving over a bill, call 112."
     ]
    },
    {
     "t": "p",
     "text": "### Rooftops, late-night food and traps"
    },
    {
     "t": "p",
     "text": "**Rooftops for sunset**"
    },
    {
     "t": "list",
     "items": [
      "Piram Martini Terrace, Termini: €12, walk-in only",
      "Terrazza Cielo, Termini: €14; aperitivo €22",
      "Rooftop Spritzeria Monti: Colosseum view, €13",
      "Mùn €16 · Terrazza Clementino near Trevi €15 · Paparazzo, Prati €15 (weekend DJ)",
      "Cielo at Hotel de la Ville €25 · Terrazza Les Étoiles, St Peter's view, €45 aperitivo"
     ]
    },
    {
     "t": "p",
     "text": "Smart casual. Call ahead: many terraces are summer-focused."
    },
    {
     "t": "p",
     "text": "**Late-night food**"
    },
    {
     "t": "list",
     "items": [
      "**Trastevere:** Donkey Punch sandwiches to 04:00; Cabullo, Osteria Cacio e Pepe, Wiki Wiki to 02:00",
      "**Campo / Pantheon:** Romoletto, Cybo, Antica Salumeria (~€20) to 02:00. Testaccio is thin after 01:00.",
      "**Arrival night:** Mercato Centrale closes 23:30, so eat before you fly."
     ]
    },
    {
     "t": "p",
     "text": "**Tourist traps**"
    },
    {
     "t": "list",
     "items": [
      "Touts outside, photo menus, “menu turistico”, tables facing Trevi, the Pantheon or Navona.",
      "Walk 8–12 minutes away: dinner for two is €100–150 on Piazza Navona vs €60–80 in Trastevere or Testaccio.",
      "Gelato: avoid tall neon mountains; real pistachio is olive-brown."
     ]
    },
    {
     "t": "p",
     "text": "### Daily food budget"
    },
    {
     "t": "table",
     "head": [
      "",
      "Lean day",
      "Typical day"
     ],
     "rows": [
      [
       "Bar breakfast",
       "€4",
       "€5"
      ],
      [
       "Street-food lunch",
       "€8–10",
       "€12–15"
      ],
      [
       "Gelato / snack",
       "€3–4",
       "€4–5"
      ],
      [
       "Aperitivo",
       "€5–6",
       "€12–14"
      ],
      [
       "Trattoria dinner + house wine",
       "€25–30",
       "€35–40"
      ],
      [
       "Water, coperto, extras",
       "€3",
       "€4"
      ],
      [
       "**Total**",
       "**≈€48–57**",
       "**≈€72–83**"
      ]
     ]
    }
   ]
  },
  {
   "id": "photos",
   "title": "Photo tips",
   "subtitle": "Light on your dates, solo tips and the rules",
   "icon": "camera",
   "blocks": [
    {
     "t": "p",
     "text": "### Light on your dates"
    },
    {
     "t": "table",
     "head": [
      "Date",
      "Morning blue hour",
      "Sunrise",
      "Sunset",
      "Evening blue hour"
     ],
     "rows": [
      [
       "Fri 9 Oct",
       "06:37–06:58",
       "07:15",
       "18:38",
       "18:56–19:17"
      ],
      [
       "Sat 10 Oct",
       "06:38–06:59",
       "07:17",
       "18:37",
       "18:54–19:15"
      ],
      [
       "Sun 11 Oct",
       "06:39–07:01",
       "07:18",
       "18:35",
       "18:52–19:14"
      ],
      [
       "Mon 12 Oct",
       "06:40–07:02",
       "07:19",
       "18:34",
       "18:51–19:12"
      ]
     ]
    },
    {
     "t": "p",
     "text": "Be in place 20 minutes before sunset. Avoid 11:00–15:00: harsh light and peak crowds."
    },
    {
     "t": "p",
     "text": "### The dawn loop"
    },
    {
     "t": "p",
     "text": "About 3.5 km on foot, best on Mon 12 Oct or any morning you're up early. Ask a hostel friend along: safer and more fun in the dark."
    },
    {
     "t": "list",
     "ordered": true,
     "items": [
      "**07:00 · Spanish Steps**: Metro A to Spagna first",
      "**07:25 · Trevi Fountain**: From the piazza",
      "**~07:45 · Sant'Ignazio piazza**: A theatre-set of a square",
      "**~08:05 · Pantheon**: The portico before the crowds",
      "**08:30 · Piazza Navona**: Almost empty",
      "**~08:45 · Via dei Coronari**: Pastel street",
      "**~09:00 · Ponte Sant'Angelo**: Angels and the castle"
     ]
    },
    {
     "t": "p",
     "text": "### Shooting solo, and the rules"
    },
    {
     "t": "list",
     "items": [
      "A small phone clamp with a Bluetooth remote, or a 3–10 s timer in burst mode. Walls and river steps make natural tripods, but some ledges have a big drop.",
      "Never leave your phone alone on a tripod.",
      "Swap shots with other dawn photographers: show them an example of what you want.",
      "Creator tips: the first floor of the Benetton shop opposite Trevi gives a free elevated view (not checked if still open). TikTokers call Via Nicola Salvi the most Instagrammable view of the Colosseum. Even at 07:00, crowds gather at Trevi."
     ]
    },
    {
     "t": "table",
     "head": [
      "Where",
      "Rule"
     ],
     "rows": [
      [
       "**Everywhere central**",
       "No drones. Tourists have had drones seized, even under 250 g; one got a suspended sentence and a €222 fine."
      ],
      [
       "**Vatican Museums**",
       "No photos or video in the Sistine Chapel; no flash, tripods or selfie sticks."
      ],
      [
       "**St Peter's**",
       "Photos OK; no flash; no tripods in the basilica or square."
      ],
      [
       "**Colosseum**",
       "No selfie sticks, no costumes, no leaning over railings."
      ],
      [
       "**Spanish Steps**",
       "Standing and photos: fine. Sitting €250; eating up to €400."
      ],
      [
       "**Trevi**",
       "No food, drink, sitting on the edge or wading; fines €40–240, wading €450+."
      ],
      [
       "**Churches**",
       "Quiet, no flash, no photos during Mass."
      ]
     ]
    }
   ]
  },
  {
   "id": "docs",
   "title": "Documents and visa",
   "subtitle": "Your visa sticker, the passport law, police checks",
   "icon": "doc",
   "blocks": [
    {
     "t": "table",
     "head": [
      "Visa sticker field",
      "What you want to see"
     ],
     "rows": [
      [
       "**VALID FOR**",
       "“Schengen States” / “États Schengen” means valid in Italy. A list of countries instead (for example only “ES”) is a limited visa and not valid for Italy unless “IT” is on it."
      ],
      [
       "**FROM … UNTIL**",
       "“Until” must be 12 Oct 2026 or later."
      ],
      [
       "**TYPE**",
       "“C” = short stay."
      ],
      [
       "**ENTRIES**",
       "1, 2 or MULT. Barcelona → Rome is inside Schengen, so it doesn't use an entry."
      ],
      [
       "**DURATION OF VISIT**",
       "Count all your days in Schengen on this trip up to 12 Oct, arrival and departure days included; they must fit. [EU calculator](https://home-affairs.ec.europa.eu/policies/schengen/border-crossing/short-stay-calculator_en)"
      ]
     ]
    },
    {
     "t": "list",
     "ordered": false,
     "items": [
      "**No entry stamp? Normal.** The EU Entry/Exit System replaced stamps on 10 Apr 2026; your face and fingerprints were recorded at entry.",
      "**Carry your original passport at all times. It's the law.** A foreigner who can't show a passport and proof of legal stay when police ask, without good reason, faces arrest of up to 1 year and a fine of up to €2,000 (D.Lgs. 286/1998, art. 6). Keep it in a zipped inner pocket.",
      "**Your hostel handles the “dichiarazione di presenza”.** Non-EU visitors arriving from another Schengen country must declare their presence within 8 days; the registration you sign at check-in counts.",
      "**Insurance:** your visa insurance covers emergency care, hospital and repatriation. Save its 24/7 number.",
      "**Backups:** photos of your passport and visa in the cloud, plus one paper copy kept apart from the passport."
     ]
    },
    {
     "t": "callout",
     "title": "Police-check folder (paper + phone)",
     "text": "Passport with visa · hostel booking · Pegasus e-ticket for 12 Oct · travel insurance · cards plus some cash. Since 1 Aug 2026 Italy has run targeted checks on non-EU travellers arriving from Spain, renewed in 15-day blocks; the last confirmed period ends 1 Oct. People without documents are the ones refused.",
     "tone": "accent"
    }
   ]
  },
  {
   "id": "money",
   "title": "Money",
   "subtitle": "Cards, cash, and a euro-to-lira converter",
   "icon": "euro",
   "blocks": [
    {
     "t": "special",
     "kind": "converter"
    },
    {
     "t": "list",
     "ordered": false,
     "items": [
      "**Bring a Visa or Mastercard, ideally two from different banks.** Rome's contactless transport accepts Visa, Mastercard, Amex, JCB, UnionPay, Maestro and V Pay. TROY isn't on the list, so a TROY-only card will probably fail on the metro, at Trevi's card-only gate and in many shops.",
      "Cards work almost everywhere: Italian shops can be fined for refusing card payment.",
      "**Always pay in EUR, never TRY.** If a machine offers to charge you in TRY, refuse: that's dynamic currency conversion, with markups up to 18%.",
      "**Avoid Euronet and stand-alone “tourist” ATMs** (high fees, bad rates). Use an ATM at a real bank branch.",
      "**Bring €100–150 in cash** from home. Carry €50–100 and lock the rest away.",
      "**Wise and Revolut aren't available to Türkiye residents.** Ask your bank about its foreign-transaction fee."
     ]
    }
   ]
  },
  {
   "id": "phone",
   "title": "Phone, data and apps",
   "subtitle": "eSIM options and what to install",
   "icon": "signal",
   "blocks": [
    {
     "t": "p",
     "text": "Install a travel eSIM at home on Wi-Fi (the phone must be unlocked and eSIM-capable). Keep your Turkish SIM on for bank SMS codes, with its data roaming off. 5 GB is plenty for four days; Italian tourist SIMs (~€25 for 200 GB) are overkill."
    },
    {
     "t": "table",
     "head": [
      "Option",
      "Price",
      "What you get"
     ],
     "rows": [
      [
       "Nomad Italy",
       "$11 / $18.50",
       "5 GB / 10 GB, 30 days"
      ],
      [
       "Saily Italy",
       "$12.99 / $20.99",
       "5 GB / 10 GB, 30 days"
      ],
      [
       "Airalo Italy",
       "$17",
       "5 days unlimited"
      ],
      [
       "Holafly Italy",
       "$17.50",
       "5 days unlimited"
      ],
      [
       "**Turkcell Avrupa Gezgin 10 GB** (if you're on Turkcell)",
       "1,200 TL",
       "10 GB + 500 min + 200 SMS, 2 weeks, Italy included; SMS “AVRUPA GEZGIN 10 GB” to 2200"
      ]
     ]
    },
    {
     "t": "tags",
     "items": [
      "Google Maps with Rome offline",
      "Citymapper (strike alerts)",
      "Bank app + phone wallet",
      "Trenitalia",
      "ChiamaTaxi / 060609",
      "FreeNow",
      "Where ARE U (112 + location)",
      "Hostelworld",
      "Resident Advisor",
      "Musei Italiani (Pantheon)",
      "Wizz Air",
      "Pegasus",
      "Tinder / Hinge / Bumble",
      "Waidy WOW (water fountains)"
     ]
    }
   ]
  },
  {
   "id": "pack",
   "title": "Packing and weather",
   "subtitle": "Bag limits and a checklist",
   "icon": "bag",
   "blocks": [
    {
     "t": "table",
     "head": [
      "Bag rule",
      "Limit"
     ],
     "rows": [
      [
       "Wizz Air free under-seat bag",
       "40×30×20 cm, max 10 kg"
      ],
      [
       "Pegasus cheapest fare (Light)",
       "**40×30×15 cm, max 3 kg**, nothing else"
      ],
      [
       "Colosseum",
       "max 30×40×15 cm, no cloakroom"
      ],
      [
       "Borghese Gallery",
       "only pouches up to 21×15 cm inside; the rest goes to the mandatory wardrobe"
      ]
     ]
    },
    {
     "t": "p",
     "text": "One soft backpack of about 40×30×15 cm passes Wizz, Pegasus Light and the Colosseum. On a Light fare, wear your heaviest clothes on the plane or buy extra baggage online."
    },
    {
     "t": "special",
     "kind": "packing"
    },
    {
     "t": "callout",
     "title": "Weather",
     "text": "Highs about 21–22 °C, often 23–25 °C on sunny “ottobrate”; lows 13–14 °C; 7–8 rainy days in October. Check the real forecast from 5 Oct.",
     "tone": "gold"
    }
   ]
  },
  {
   "id": "move",
   "title": "Getting around",
   "subtitle": "Metro, tap-to-pay, buses, taxis",
   "icon": "metro",
   "blocks": [
    {
     "t": "list",
     "ordered": false,
     "items": [
      "**Walk first.** Pantheon → Colosseum is about 1.6 km (26 min); Navona → St Peter's about 1.4 km (23 min). In the centre, buses are often slower than walking.",
      "**Metro:** 05:30–23:30 Sunday to Thursday; last trains about 01:30 on Friday and Saturday nights. Some sites give other times, so check Citymapper.",
      "**Tap&Go:** tap your contactless card or phone at the gate or bus reader and wait for green; tap again on every new vehicle. €1.50 per tap = 100 min + one metro ride. After 5 rides in 24 h the charge stops at €8.50, but only if you always tap the same card or the same phone (a card and its phone-wallet copy count as different).",
      "**Paper tickets** (tabacchi, newsstands, machines): BIT €1.50, 24h €8.50, 48h €15, 72h €22, 7-day €29; validate every trip. None covers the Leonardo Express. At 2–4 rides a day, Tap&Go beats passes.",
      "**Night buses:** nMA/nMB follow Metro A/B from midnight, often 30–40+ min apart; n8, n70 and n716 go to Termini.",
      "**Taxis:** white car, TAXI roof sign, Rome crest and licence number. Use a rank or an app (ChiamaTaxi / 060609, FreeNow; Uber also operates). Start €3.50 on weekdays, €5 on Sundays, €7.50 at night (22:00–06:00), then €1.33–1.73/km; airport €55 fixed. Ask for “la ricevuta” (receipt).",
      "**Fines:** no valid ticket costs €54.90 (paid within 5 days) or €104.90. No strikes were scheduled in Rome for 8–12 Oct as of 28 Sep."
     ]
    },
    {
     "t": "table",
     "head": [
      "Line",
      "Route",
      "Use it for"
     ],
     "rows": [
      [
       "Metro A",
       "Termini – Barberini – Spagna – Ottaviano",
       "Vatican; Spanish Steps"
      ],
      [
       "Metro B",
       "Termini – Cavour – Colosseo – Piramide",
       "Colosseum; Testaccio"
      ],
      [
       "Metro C",
       "New Colosseo–Fori Imperiali (interchange with B)",
       "Colosseum"
      ],
      [
       "**Bus 40 / 64**",
       "Termini – Piazza Venezia – Vatican side",
       "Fast, but pickpocket buses"
      ],
      [
       "**Tram 8 / Bus H**",
       "Piazza Venezia / Termini – Trastevere (tram 8 continues to Casaletto)",
       "Trastevere nights"
      ],
      [
       "**Bus 87**",
       "Piazza Cavour – Navona – Colosseum",
       "Centre hops"
      ]
     ]
    }
   ]
  },
  {
   "id": "safety",
   "title": "Safety, scams and fines",
   "subtitle": "Pickpockets, bar scams, red zones, laws",
   "icon": "shield",
   "blocks": [
    {
     "t": "p",
     "text": "Violent crime is low; pickpocketing is high in the centre and at big sights. Passport in a zipped inner pocket, phone in a front pocket, backpack on your chest in crowds. Hotspots: Metro A, buses 40 and 64, Termini platforms, Trevi, the Colosseum queue and the Vatican entry lanes."
    },
    {
     "t": "table",
     "head": [
      "Scam",
      "How it works",
      "What you do"
     ],
     "rows": [
      [
       "**Clip-joint bar**",
       "A friendly stranger, often an attractive woman, invites you for a drink; the bill is hundreds of euros and bouncers block the door.",
       "Only bars you choose; see a priced menu first."
      ],
      [
       "**Club touts**",
       "“Free entry”, then crazy prices and scary bouncers.",
       "Refuse street offers."
      ],
      [
       "**Fake police**",
       "Fake “Tourist Police” or “Guardia di Finanza” ask for your wallet.",
       "Never hand it over; ask for a badge number, offer to go to a real station, call 112."
      ],
      [
       "**Bracelets / roses / gladiators**",
       "A “gift” or a photo, then a demand for money (gladiators ask €5 and up).",
       "“No, grazie”, keep walking."
      ],
      [
       "**Petitions / machine “helpers”**",
       "A distraction for a pickpocket, or a fee for “help”.",
       "Walk away; use Tap&Go or staff."
      ],
      [
       "**Padded bills**",
       "Surprise charges (€81 for drinks near a landmark).",
       "Priced menu, itemised bill, 112 if blocked."
      ],
      [
       "**Unlicensed taxis**",
       "2–3× the fare.",
       "Official rank or app only."
      ],
      [
       "**Drink spiking**",
       "Victims robbed and sometimes assaulted.",
       "Never leave your drink; take drinks only from the bartender."
      ],
      [
       "**Fake dating profiles**",
       "A fast move to WhatsApp, money requests, one “special” bar.",
       "Unmatch; never send money."
      ]
     ]
    },
    {
     "t": "callout",
     "title": "Red zones (zone rosse)",
     "text": "Police can remove people behaving aggressively. The Esquilino zone includes Via Giolitti, Via Principe Amedeo, Via Gioberti, Via Cattaneo, Via Turati and Piazza Vittorio; since 24 Aug 2026 also Colosseo, Fori Imperiali and Colle Oppio (to 24 Dec), with San Lorenzo and Esquilino extended. At night don't linger around Termini, Piazza dei Cinquecento or the Esquilino side streets, don't cross Colle Oppio park, and in San Lorenzo stay on busy streets.",
     "tone": "accent"
    },
    {
     "t": "list",
     "ordered": false,
     "items": [
      "**Drugs: don't.** Personal cannabis is an administrative offence, dealing is a crime, and “cannabis light” flowers are banned. Street deals mean robbery risk, and a record could hurt future visas.",
      "**Night alcohol ban:** shops without seating can't sell takeaway alcohol 22:00–05:00 on Friday, Saturday and Sunday nights across most of Rome, including the centre, Monti and Trastevere, until 11 Oct 2026 (renewal unconfirmed). Bars keep serving.",
      "**No drinking from glass** on streets, transport or open parks after 22:00. No smoking in bars, restaurants, clubs or public transport. Buying fake designer goods is fined too."
     ]
    },
    {
     "t": "table",
     "head": [
      "Offence",
      "Fine"
     ],
     "rows": [
      [
       "No passport for police (no good reason)",
       "arrest up to 1 year + up to €2,000"
      ],
      [
       "No valid transport ticket",
       "€54.90 / €104.90"
      ],
      [
       "Sitting on the Spanish Steps",
       "€250"
      ],
      [
       "Eating on / dirtying the Spanish Steps",
       "up to €400"
      ],
      [
       "Trevi: food, drink, sitting on the edge",
       "€40–240"
      ],
      [
       "Trevi: wading or drawing water",
       "from €450"
      ],
      [
       "Graffiti on the Colosseum",
       "up to €15,000 + up to 5 years"
      ],
      [
       "Not declaring presence (the hostel does it)",
       "€103–309"
      ],
      [
       "Drone near the Colosseum",
       "seized; one case €222"
      ],
      [
       "Eating at monuments* / feet in fountains*",
       "€160–400 / €200–500"
      ],
      [
       "Street drinking at night* / public urination*",
       "€150–500 / €300–500"
      ],
      [
       "Buying counterfeit goods*",
       "€100–7,000"
      ]
     ]
    },
    {
     "t": "p",
     "text": "* From an aggregator (SkipTheFine), not official texts: a rough guide."
    }
   ]
  },
  {
   "id": "depart",
   "title": "Departure day, Mon 12 Oct",
   "subtitle": "Termini 11:05 → Terminal 3 → Pegasus 14:50",
   "icon": "plane",
   "blocks": [
    {
     "t": "list",
     "ordered": true,
     "items": [
      "**Night before:** Pegasus online check-in (opens Mon 5 Oct 14:50, closes 60 min before). Check your bag fits your fare: the cheapest allows one 40×30×15 cm bag, 3 kg; oversized bags are charged at boarding.",
      "**10:45, Termini platforms 23–24:** €14 ticket, validate, 11:05 train (arrives 11:37). By taxi (€55) leave around 10:45; the SIT bus from Via Marsala 5 (10:10, 10:30, 10:50) takes 50–70 min.",
      "**~11:50, Terminal 3** (5–10 min walk from the station). Pegasus flies from T3 to Istanbul Sabiha Gökçen daily.",
      "**Pegasus counter** for bag drop or a document check; it closes at 13:50.",
      "**Security.**",
      "**Passport control / EES exit:** your passport is scanned and your face and/or fingerprints checked against your entry record. No stamp. The officer may check you stayed within your visa's days and dates.",
      "**E gates** (non-Schengen): at the gate by 14:10; it closes 14:30.",
      "**14:50:** take off. Latest safe arrival at T3: about 12:20."
     ]
    },
    {
     "t": "p",
     "text": "If you're a Turkish citizen flying home, nothing extra is needed to enter Türkiye: the only formality today is the Schengen exit check."
    }
   ]
  },
  {
   "id": "budget",
   "title": "Budget",
   "subtitle": "About €150 a full day, €503 for the trip",
   "icon": "euro",
   "blocks": [
    {
     "t": "p",
     "text": "Estimated spend on the ground by day, excluding the hostel. Hover or tap a segment for details."
    },
    {
     "t": "special",
     "kind": "budget"
    },
    {
     "t": "list",
     "ordered": false,
     "items": [
      "**Full days average ≈€150**, which fits “€120+, do as much as possible”: crawl, club, rooftop and a famous trattoria included.",
      "**Saver version ≈€103/day:** hostel party instead of the crawl, street-food dinner, €5 spritz instead of a rooftop, walk instead of taxis.",
      "**Add-ons:** Castel Sant'Angelo +€18; Colosseum Full Experience +€6; Borghese up to +€5 if the price turns out to be €18; Eating Europe tour €94 instead of the Saturday dinner and bars.",
      "**Hostel (separate):** 4 nights × ~€35–70 + €14 tax = €154–294 (≈8,590–16,400 TL). All-in on the ground: ~€657–797 (≈36,700–44,500 TL), plus the eSIM and any Pegasus bag upgrade."
     ]
    },
    {
     "t": "p",
     "text": "Thursday transport assumes the SIT bus (~€9; its one-way price isn't published). The €55 taxi instead adds about €46."
    }
   ]
  },
  {
   "id": "phrases",
   "title": "Useful Italian",
   "subtitle": "Tap to hear it spoken",
   "icon": "speaker",
   "blocks": [
    {
     "t": "special",
     "kind": "phrases"
    }
   ]
  },
  {
   "id": "sources",
   "title": "Sources and pictures",
   "subtitle": "Where these facts come from",
   "icon": "book",
   "blocks": [
    {
     "t": "p",
     "text": "Prices, hours and events were checked on 28 Sep 2026; re-check anything marked unconfirmed. TikTok, Instagram, YouTube and Reddit block automated reading, so “viral” verdicts come from food critics (The Infatuation, Katie Parla, Michelin, Time Out), 2024–2026 creator and travel blogs, and an aggregator that summarises social posts. The pictures on this page are original illustrations; the Photos buttons open real photos. The maps are approximate."
    },
    {
     "t": "list",
     "ordered": false,
     "items": [
      "[Wizz Air: check-in process](https://www.wizzair.com/en-gb/help-centre/check-in-and-boarding/check-in/check-in-process)",
      "[Pegasus: check-in](https://www.flypgs.com/en/useful-info/info-about-flights/check-in) · [bundles](https://www.flypgs.com/en/travel-services/flight-services/flight-packages)",
      "[Trenitalia: Leonardo Express timetable](https://www.trenitalia.com/content/dam/trenitalia/allegati/info/orario-digitale/collegamenti/orari-leonardo-express.pdf)",
      "[SIT Bus Shuttle: Fiumicino to Rome](https://www.sitbusshuttle.com/fermate-e-orari/orari-fiumicino-roma/)",
      "[Roma Mobilità: official taxi fares](https://romamobilita.it/muoversi-a-roma/taxi/)",
      "[Euronews: checks on arrivals from Spain](https://www.euronews.com/my-europe/2026/07/31/italy-suspends-schengen-with-spain-over-ceuta-migrant-crisis-shuts-air-and-sea-borders)",
      "[European Commission: Entry/Exit System](https://home-affairs.ec.europa.eu/news/entry-exit-system-fully-operational-10-april-2026-who-exempt-2026-07-27_en)",
      "[Ministry of Transport: strike calendar](https://scioperi.mit.gov.it/mit2/public/scioperi)",
      "[D.Lgs. 286/1998, art. 6](https://www.brocardi.it/testo-unico-immigrazione/titolo-ii/capo-i/art6.html)",
      "[ATAC: Tap&Go](https://www.atac.roma.it/biglietti-e-abbonamenti/tap-and-go) · [fares](https://www.atac.roma.it/biglietti-e-abbonamenti)",
      "[ECB: EUR/TRY rate](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/eurofxref-graph-try.en.html)"
     ]
    },
    {
     "t": "list",
     "ordered": false,
     "items": [
      "[Colosseum: opening times and tickets](https://colosseo.it/en/opening-times-and-tickets/)",
      "[Vatican Museums: hours](https://www.museivaticani.va/content/museivaticani/en/info/orari-musei-vaticani.html)",
      "[St Peter's Basilica: visitor FAQ](https://www.basilicasanpietro.va/en/help/the-basilica)",
      "[Galleria Borghese: tickets](https://galleriaborghese.cultura.gov.it/en/visita/info-biglietti/)",
      "[Pantheon](https://direzionemuseiroma.cultura.gov.it/en/pantheon/)",
      "[Trevi Fountain: official site](https://fontanaditrevi.roma.it/en)",
      "[VIVE / Vittoriano](https://vive.cultura.gov.it/en/info-and-timetables-1)",
      "[YellowSquare FAQ](https://yellowsquare.com/faqs/) · [HOSCARs 2026](https://global.hostelworld.com/hoscars)",
      "[Resident Advisor: Rome, week of 8 Oct](https://ra.co/events/it/rome?week=2026-10-08)",
      "[The Infatuation: classic Rome restaurants](https://www.theinfatuation.com/rome/guides/classic-rome-restaurants-worth-the-hype)",
      "[Katie Parla: where to eat in Rome](https://katieparla.com/where-to-eat-drink-shop-rome/)",
      "[UK FCDO: Italy safety](https://www.gov.uk/foreign-travel-advice/italy/safety-and-security)",
      "[Turkish Embassy in Rome](https://roma-be.mfa.gov.tr/Mission/Contact)"
     ]
    }
   ]
  }
 ],
 "sos": [
  {
   "label": "Any emergency: free, works with no SIM, English spoken",
   "value": "112",
   "big": true,
   "tel": "112"
  },
  {
   "label": "Doctor, non-urgent, 24/7 (for tourists too)",
   "value": "116117",
   "tel": "116117"
  },
  {
   "label": "Turkish Embassy (if you're a Turkish citizen) · Via Palestro 28, same street as YellowSquare · Mon–Fri 09:00–13:00, 14:00–18:00",
   "value": "+39 06 445 941",
   "tel": "+3906445941"
  },
  {
   "label": "Embassy emergency, after hours",
   "value": "+39 340 1766431",
   "tel": "+393401766431"
  },
  {
   "label": "Turkish 24/7 Consular Call Centre",
   "value": "+90 312 292 29 29",
   "tel": "+903122922929"
  },
  {
   "label": "Official taxi · Bill fraud (Guardia di Finanza)",
   "value": "060609 · 117",
   "tel": "060609"
  },
  {
   "label": "Hospital nearest Termini (Metro B “Policlinico”)",
   "value": "Policlinico Umberto I, Viale del Policlinico 155",
   "text": true
  },
  {
   "label": "Pharmacies",
   "value": "Farmacia Termini, Via Marsala 29 (07:00–21:00) · Farmacia Piram, Via Nazionale 228 (07:30–23:00)",
   "text": true
  }
 ],
 "sosSteps": [
  "In danger, call 112. Block your cards.",
  "File a report at a Polizia di Stato or Carabinieri station (“denuncia di smarrimento” for loss, “di furto” for theft) and get a stamped copy.",
  "Call the Turkish Embassy and ask for an urgent consular appointment.",
  "Apply for an emergency travel document (“Pasaport Yerine Geçen Belge”); it usually needs the police report, a photo and ID details.",
  "A police report alone won't get you out of Italy. Tell Pegasus, and go to the airport early."
 ],
 "driverCard": [
  "Per favore, mi porti a:",
  "YellowSquare Rome",
  "Via Palestro 51",
  "00185 Roma",
  "Tariffa fissa? Grazie!"
 ],
 "phrases": [
  [
   "Ciao / Buongiorno / Buonasera",
   "chow / bwon-JOR-noh / bwon-ah-SEH-rah",
   "Hi / Good morning / Good evening"
  ],
  [
   "Grazie / Prego",
   "GRAH-tsee-eh / PREH-goh",
   "Thanks / You're welcome"
  ],
  [
   "Per favore / Scusi",
   "pehr fah-VOH-reh / SKOO-zee",
   "Please / Excuse me"
  ],
  [
   "Parla inglese?",
   "PAR-lah een-GLEH-zeh",
   "Do you speak English?"
  ],
  [
   "Non capisco",
   "non kah-PEE-skoh",
   "I don't understand"
  ],
  [
   "Un cappuccino e un cornetto",
   "oon kahp-poo-CHEE-noh eh oon kor-NET-toh",
   "A cappuccino and a croissant"
  ],
  [
   "Quanto costa?",
   "KWAN-toh KOS-tah",
   "How much?"
  ],
  [
   "Il conto, per favore",
   "eel KON-toh",
   "The bill, please"
  ],
  [
   "Il conto dettagliato?",
   "det-tahl-YAH-toh",
   "Itemised bill?"
  ],
  [
   "Acqua del rubinetto",
   "AHK-kwah del roo-bee-NET-toh",
   "Tap water"
  ],
  [
   "C'è maiale? / Senza maiale",
   "cheh my-AH-leh / SEN-tsah",
   "Is there pork? / Without pork"
  ],
  [
   "Un tavolo per uno",
   "TAH-voh-loh pehr OO-noh",
   "Table for one"
  ],
  [
   "Dov'è la metro?",
   "doh-VEH lah MEH-troh",
   "Where's the metro?"
  ],
  [
   "Tariffa fissa, cinquantacinque euro?",
   "tah-REEF-fah FEES-sah, cheen-kwahn-tah-CHEEN-kweh",
   "Fixed fare, €55?"
  ],
  [
   "No, grazie",
   "noh GRAH-tsee-eh",
   "No, thanks"
  ],
  [
   "Piacere, sono…",
   "pyah-CHEH-reh, SOH-noh",
   "Nice to meet you, I'm…"
  ],
  [
   "Sei di Roma?",
   "say dee ROH-mah",
   "Are you from Rome?"
  ],
  [
   "Aiuto! Chiami la polizia!",
   "ah-YOO-toh! KYAH-mee lah poh-lee-TSEE-ah",
   "Help! Call the police!"
  ],
  [
   "Ho perso il passaporto",
   "oh PEHR-soh eel pahs-sah-POR-toh",
   "I lost my passport"
  ]
 ],
 "budget": [
  {
   "dayId": "thu",
   "label": "Thu 8",
   "values": [
    0,
    5,
    0,
    16.45
   ],
   "notes": [
    "",
    "",
    "",
    "Aerobús + airport bus (~€9)"
   ]
  },
  {
   "dayId": "fri",
   "label": "Fri 9",
   "values": [
    51,
    61,
    55,
    4.5
   ],
   "notes": [
    "Vatican, dome online, Pantheon, Trevi",
    "Incl. Armando ~€35",
    "Crawl + drinks",
    ""
   ]
  },
  {
   "dayId": "sat",
   "label": "Sat 10",
   "values": [
    36,
    69,
    30,
    20
   ],
   "notes": [
    "Colosseum, Vittoriano",
    "Rooftop, trattoria",
    "Bars + club €10",
    "Incl. taxi home"
   ]
  },
  {
   "dayId": "sun",
   "label": "Sun 11",
   "values": [
    13,
    75,
    15,
    20
   ],
   "notes": [
    "Borghese",
    "Sunday lunch + dinner",
    "",
    "Incl. taxi to the Borghese"
   ]
  },
  {
   "dayId": "mon",
   "label": "Mon 12",
   "values": [
    0,
    15,
    0,
    17
   ],
   "notes": [
    "",
    "",
    "",
    "Bus + €14 train"
   ]
  }
 ],
 "overlay": {
  "lines": [
   {
    "id": "A",
    "color": "#DC5F17",
    "stations": [
     {
      "name": "Cipro",
      "lat": 41.9076,
      "lng": 12.4476
     },
     {
      "name": "Ottaviano",
      "lat": 41.9095,
      "lng": 12.4581
     },
     {
      "name": "Lepanto",
      "lat": 41.9145,
      "lng": 12.4663
     },
     {
      "name": null,
      "lat": 41.9127,
      "lng": 12.4718
     },
     {
      "name": "Flaminio",
      "lat": 41.911,
      "lng": 12.4757
     },
     {
      "name": "Spagna",
      "lat": 41.9068,
      "lng": 12.4847
     },
     {
      "name": "Barberini",
      "lat": 41.9039,
      "lng": 12.4887
     },
     {
      "name": "Repubblica",
      "lat": 41.902,
      "lng": 12.496
     },
     {
      "name": "Termini",
      "lat": 41.901,
      "lng": 12.5018
     },
     {
      "name": "Vittorio Emanuele",
      "lat": 41.8947,
      "lng": 12.5047
     },
     {
      "name": "Manzoni",
      "lat": 41.8889,
      "lng": 12.5068
     },
     {
      "name": "San Giovanni",
      "lat": 41.8858,
      "lng": 12.5097
     }
    ]
   },
   {
    "id": "B",
    "color": "#1F5CA8",
    "stations": [
     {
      "name": "Policlinico",
      "lat": 41.9084,
      "lng": 12.5112
     },
     {
      "name": "Castro Pretorio",
      "lat": 41.9064,
      "lng": 12.5063
     },
     {
      "name": "Termini",
      "lat": 41.901,
      "lng": 12.5018
     },
     {
      "name": "Cavour",
      "lat": 41.8945,
      "lng": 12.4935
     },
     {
      "name": "Colosseo",
      "lat": 41.8914,
      "lng": 12.4924
     },
     {
      "name": "Circo Massimo",
      "lat": 41.8836,
      "lng": 12.4885
     },
     {
      "name": "Piramide",
      "lat": 41.8759,
      "lng": 12.4817
     },
     {
      "name": "Garbatella",
      "lat": 41.869,
      "lng": 12.4845
     }
    ]
   },
   {
    "id": "C",
    "color": "#1D8F48",
    "stations": [
     {
      "name": "Colosseo–Fori Imperiali",
      "lat": 41.8921,
      "lng": 12.4912
     },
     {
      "name": "Porta Metronia",
      "lat": 41.8812,
      "lng": 12.4985
     },
     {
      "name": "San Giovanni",
      "lat": 41.8858,
      "lng": 12.5097
     }
    ]
   }
  ]
 },
 "variant": {
  "id": "colosseum",
  "question": "Which day is your Colosseum ticket?",
  "hint": "Saturday and Sunday rearrange themselves.",
  "default": "sat",
  "options": [
   {
    "id": "sat",
    "label": "Sat 10"
   },
   {
    "id": "sun",
    "label": "Sun 11"
   }
  ]
 },
 "nightCards": [
  {
   "num": "VIII",
   "day": "Thu · arrival",
   "title": "Hostel bar, if you're still up",
   "text": "You land near midnight. YellowSquare's bar is the easy first hello.",
   "scene": "hostel",
   "dayId": "thu"
  },
  {
   "num": "IX",
   "day": "Fri",
   "title": "Build your group",
   "text": "Rome's Ultimate Party pub crawl from The Highlander Pub at 21:30, then a club after 00:30.",
   "scene": "crawl",
   "dayId": "fri"
  },
  {
   "num": "X",
   "day": "Sat",
   "title": "The big night",
   "text": "Monti festival aperitivo, Trastevere bars from 23:00, then Visionnaire or Circolo degli Illuminati from 01:00.",
   "scene": "club",
   "dayId": "sat"
  },
  {
   "num": "XI",
   "day": "Sun",
   "title": "Keep it light",
   "text": "Hostel party, Alessandro Palace beer pong (20:00–23:00), a ghost walk at 20:00, or Max Richter at Teatro Argentina. Early night: you fly Monday.",
   "scene": "theatre",
   "dayId": "sun"
  }
 ],
 "createdAt": "2026-09-29T00:00:00.000Z",
 "updatedAt": "2026-09-29T00:00:00.000Z"
}
