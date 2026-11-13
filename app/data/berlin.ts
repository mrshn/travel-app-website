// Berlin, Sat 21 to Tue 24 Nov 2026: a solo techno weekend (RSO, Berghain, KitKat, Tresor), the Wall and the Cold War,
// the first days of the Christmas markets. Researched on 13 Nov 2026; Turkish text, as the plan was made in Turkish.
// The id and seedId are "berlin-2026-11". The home is an example area: never put a real address or booking code here.
import type { Trip } from '#shared/types/trip'

export const berlinTrip: Trip = {
 "id": "berlin-2026-11",
 "seedId": "berlin-2026-11",
 "title": "Berlin",
 "destination": "Berlin",
 "country": "Germany",
 "lang": "de-DE",
 "timezone": "Europe/Berlin",
 "start": "2026-11-21",
 "end": "2026-11-24",
 "subtitle": "Cmt 21 – Sal 24 Kas · 3 gece · solo · tekno, Duvar, Noel pazarları",
 "cover": {
  "scene": "club",
  "tod": "night"
 },
 "currency": "EUR",
 "fx": {
  "homeCurrency": "TRY",
  "rate": 56.3,
  "source": "Piyasa ortası kuru, 10 Kas 2026"
 },
 "home": {
  "label": "Airbnb'n",
  "name": "Airbnb'n (örnek: Friedrichshain)",
  "lat": 52.51115,
  "lng": 13.45678,
  "query": "Simon-Dach-Straße, Berlin",
  "address": "Simon-Dach-Straße çevresi, 10245 Berlin (örnek bölge)"
 },
 "airport": {
  "name": "Berlin Brandenburg (BER)",
  "lat": 52.3658,
  "lng": 13.48889,
  "label": "BER · S9 ya da FEX ~35 dk"
 },
 "days": [
  {
   "id": "sat",
   "date": "2026-11-21",
   "num": "XXI",
   "label": "Varış",
   "title": "Varış, East Side Gallery ve ilk gece: RSO",
   "cover": {
    "scene": "gallery",
    "tod": "golden"
   },
   "sun": {
    "rise": 459,
    "set": 966,
    "blueAm": [
     406,
     435
    ],
    "bluePm": [
     990,
     1019
    ]
   },
   "facts": [
    {
     "icon": "plane",
     "text": "LH1817 07:30 BCN → 09:30 MUC · LH1952 11:00 → 12:10 BER"
    },
    {
     "icon": "sunset",
     "text": "Gün batımı 16:06 · mavi saat 16:30–16:59"
    },
    {
     "icon": "night",
     "text": "RSO 23:59 → ~04:00 (Totensonntag dans yasağı)"
    },
    {
     "icon": "train",
     "text": "S-Bahn Cumartesi gecesi bütün gece çalışır"
    }
   ],
   "alerts": [
    {
     "from": 300,
     "to": 345,
     "icon": "alert",
     "text": "Biniş kartı telefonda mı? Lufthansa check-in Cuma ~08:30'da açıldı. Pasaport ve TIE yanında.",
     "tone": "warn"
    },
    {
     "from": 730,
     "to": 780,
     "icon": "ticket",
     "text": "Şehre geçmeden “Berlin ABC” tek bilet al (€5). Kâğıt bileti perondaki kutuda damgala."
    },
    {
     "from": 930,
     "to": 970,
     "icon": "sunset",
     "text": "Gün batımı 16:06: East Side Gallery'nin nehir tarafında ol."
    },
    {
     "from": 1350,
     "to": 1395,
     "icon": "shirt",
     "text": "Kulüp çantası: pasaport, nakit, kart, kulak tıkacı, küçük şarj. Siyah, sade, rahat ayakkabı."
    },
    {
     "from": 1395,
     "to": 1439,
     "icon": "alert",
     "text": "Totensonntag: dans yasağı 04:00'te başlıyor. Gece kısa, enerjini RSO'nun ilk saatlerine sakla.",
     "tone": "warn"
    }
   ],
   "journey": {
    "title": "Yolculuğun",
    "nodes": [
     {
      "time": "05:45",
      "name": "Evden çıkış",
      "sub": "Aerobus ya da taksi",
      "mode": ""
     },
     {
      "time": "06:15",
      "name": "Barcelona T1",
      "sub": "güvenlik",
      "mode": "ride"
     },
     {
      "time": "09:30",
      "name": "Münih T2",
      "sub": "1 sa 30 dk aktarma",
      "mode": "fly",
      "label": "LH1817 07:30"
     },
     {
      "time": "12:10",
      "name": "Berlin BER T1",
      "sub": "ABC bileti al",
      "mode": "fly",
      "label": "LH1952 11:00"
     },
     {
      "time": "~13:00",
      "name": "Warschauer Straße",
      "sub": "S9, aktarmasız",
      "mode": "ride"
     },
     {
      "time": "~13:15",
      "name": "Airbnb'n",
      "sub": "Friedrichshain",
      "mode": "walk"
     }
    ]
   },
   "nearby": {
    "food": [
     {
      "name": "Burgermeister",
      "sub": "U1 köprüsünün altında burger, Oberbaumstraße 8",
      "query": "Burgermeister, Oberbaumstraße 8, Berlin",
      "scene": "panino"
     },
     {
      "name": "Simon-Dach-Straße",
      "sub": "bar ve ucuz yemek sokağı, evinin dibi",
      "query": "Simon-Dach-Straße, Berlin",
      "scene": "aperitivo"
     },
     {
      "name": "Boxhagener Platz çevresi",
      "sub": "Vietnam, falafel, pizza",
      "query": "Boxhagener Platz, Berlin",
      "scene": "market"
     }
    ],
    "photos": [
     "Oberbaumbrücke ve üstünden geçen sarı U1",
     "East Side Gallery: “Kardeşlik Öpücüğü”",
     "Spree kıyısında gün batımı",
     "RAW-Gelände grafitileri"
    ],
    "cards": [
     {
      "title": "Uçaktan inerken elinde",
      "icon": "doc",
      "items": [
       {
        "icon": "doc",
        "text": "Pasaport + İspanya oturum kartı (TIE)"
       },
       {
        "icon": "ticket",
        "text": "BVG Tickets uygulaması kurulu, kart ekli"
       },
       {
        "icon": "bed",
        "text": "Airbnb mesajı: giriş talimatı ve kapı kodu"
       },
       {
        "icon": "euro",
        "text": "Biraz nakit: kulüp ve Späti için"
       }
      ]
     },
     {
      "title": "Kulüp gecesinin kuralları",
      "icon": "speaker",
      "items": [
       {
        "icon": "camera",
        "text": "İçeride fotoğraf yok: girişte kameraya sticker"
       },
       {
        "icon": "users",
        "text": "Kuyrukta sakin, tek ya da iki kişi"
       },
       {
        "icon": "shield",
        "text": "Bardağını gözden kaçırma, yabancıdan içki alma"
       },
       {
        "icon": "train",
        "text": "Dönüş: S-Bahn bütün gece"
       }
      ]
     }
    ]
   },
   "stops": [
    {
     "id": "sat-boarding-pass",
     "start": 300,
     "timeLabel": "05:00",
     "kind": "task",
     "icon": "task",
     "title": "Biniş kartı telefonda, çanta 40×30×20",
     "tip": "Lufthansa check-in kalkıştan 23 saat önce (Cuma ~08:30) açılır; tek biletle iki uçuşun biniş kartı birlikte gelir. Dönüş Vueling Basic: tek ücretsiz çanta koltuk altına sığan 40×30×20, tüm geziyi buna göre topla.",
     "tags": [
      "must"
     ],
     "bookingId": "checkin-lh",
     "minor": true
    },
    {
     "id": "sat-to-bcn",
     "start": 345,
     "end": 375,
     "timeLabel": "05:45",
     "kind": "move",
     "icon": "taxi",
     "title": "Havalimanına: taksi ya da Aerobus (T1)",
     "tip": "Lufthansa Barcelona'da Terminal 1'den kalkar. Bu saatte taksi en garantisi; Aerobus kullanacaksan ilk seferin saatine bak.",
     "minor": true
    },
    {
     "id": "sat-bcn-security",
     "start": 375,
     "timeLabel": "06:15",
     "kind": "task",
     "icon": "shield",
     "title": "Barcelona T1: güvenlik",
     "tip": "Sıvılar 100 ml, tek şeffaf poşet. Power bank: en fazla 2 tane, 100 Wh altı, kabin çantasında. Lufthansa grubunda uçuşta power bank kullanmak ve şarj etmek yasak, üst dolaba da konmuyor.",
     "minor": true
    },
    {
     "id": "sat-lh1817",
     "start": 450,
     "end": 570,
     "timeLabel": "07:30–09:30",
     "kind": "move",
     "icon": "flight",
     "title": "LH1817 Barcelona → Münih",
     "tip": "Münih Terminal 2'ye inersin. Schengen içi aktarma: pasaport kontrolü yok, genelde yeniden güvenlik de yok. Ekranda LH1952'nin kapısına bak.",
     "bookingId": "flights",
     "scene": "plane",
     "tod": "dawn"
    },
    {
     "id": "sat-muc",
     "start": 570,
     "end": 660,
     "timeLabel": "09:30–11:00",
     "kind": "rest",
     "icon": "coffee",
     "title": "Münih aktarması (1 sa 30 dk)",
     "tip": "Kahvaltı zamanı: bir Brezel ve kahve. Kapı kalkıştan 20–25 dk önce kapanır.",
     "minor": true
    },
    {
     "id": "sat-lh1952",
     "start": 660,
     "end": 730,
     "timeLabel": "11:00–12:10",
     "kind": "move",
     "icon": "flight",
     "title": "LH1952 Münih → Berlin BER",
     "tip": "BER Terminal 1'e inersin; tren istasyonu terminalin tam altında.",
     "bookingId": "flights",
     "scene": "plane",
     "tod": "day"
    },
    {
     "id": "sat-ber-ticket",
     "start": 735,
     "end": 750,
     "timeLabel": "12:15",
     "kind": "task",
     "icon": "ticket",
     "title": "BER: “Berlin ABC” tek bilet",
     "tip": "BVG Tickets uygulamasında ya da istasyon makinesinde ABC tek bilet: €5, 2 saat geçerli, aktarmalı. Kâğıt bileti binmeden damgala; kontrol sık, cezası €60.",
     "cost": "€5",
     "place": {
      "name": "BER Terminal 1",
      "lat": 52.3658,
      "lng": 13.48889,
      "query": "Flughafen BER Terminal 1, Schönefeld"
     },
     "minor": true
    },
    {
     "id": "sat-s9-in",
     "start": 755,
     "end": 795,
     "timeLabel": "12:35",
     "kind": "move",
     "icon": "train",
     "title": "S9: BER → Warschauer Straße (aktarmasız)",
     "tip": "Yaklaşık 35–40 dk. Daha hızlısı: FEX ile Ostkreuz'a (~20 dk), oradan bir durak S-Bahn. Warschauer Straße'den eve 10 dk yürüyüş.",
     "place": {
      "name": "Warschauer Straße",
      "lat": 52.50637,
      "lng": 13.45012,
      "query": "S+U Warschauer Straße, Berlin"
     },
     "via": {
      "line": "S9",
      "from": "BER",
      "to": "Warschauer Straße"
     },
     "minor": true
    },
    {
     "id": "sat-drop-bags",
     "start": 795,
     "end": 810,
     "timeLabel": "13:15",
     "kind": "rest",
     "icon": "bed",
     "title": "Airbnb: çantayı bırak",
     "tip": "Check-in çoğu ilanda 15:00'ten sonra. Erken bırakmayı ev sahibine önceden sor; olmazsa sırt çantasıyla devam, zaten küçük.",
     "place": {
      "name": "Airbnb'n (örnek bölge)",
      "lat": 52.51115,
      "lng": 13.45678,
      "query": "Simon-Dach-Straße, Berlin"
     },
     "via": "walk",
     "bookingId": "airbnb",
     "minor": true
    },
    {
     "id": "sat-lunch",
     "start": 820,
     "end": 865,
     "timeLabel": "13:40",
     "kind": "food",
     "icon": "food",
     "title": "Öğle: Burgermeister (U1 köprüsünün altı)",
     "tip": "Eski bir tuvalet pavyonunda, tepesinden U1 geçen kült burgerci; Oberbaumbrücke'den yürüyerek 10 dk. Kuyruk uzunsa çevrede döner ya da currywurst.",
     "cost": "€10–15",
     "place": {
      "name": "Burgermeister",
      "lat": 52.50112,
      "lng": 13.44246,
      "query": "Burgermeister, Oberbaumstraße 8, Berlin"
     },
     "via": "walk",
     "scene": "panino",
     "tod": "day"
    },
    {
     "id": "sat-oberbaum",
     "start": 865,
     "end": 880,
     "timeLabel": "14:25",
     "kind": "sight",
     "icon": "photo",
     "title": "Oberbaumbrücke",
     "tip": "Kreuzberg ile Friedrichshain'ı bağlayan tuğla köprü; Duvar döneminde yayalar için sınır kapısıydı. Üst kattan geçen sarı U1 treni klasik kare.",
     "cost": "Ücretsiz",
     "place": {
      "name": "Oberbaumbrücke",
      "lat": 52.50173,
      "lng": 13.44573,
      "query": "Oberbaumbrücke, Berlin"
     },
     "via": "walk",
     "scene": "perspective",
     "tod": "day",
     "placeId": "photo-oberbaum"
    },
    {
     "id": "sat-esg",
     "start": 880,
     "end": 970,
     "timeLabel": "14:40–16:10",
     "kind": "sight",
     "icon": "sight",
     "title": "East Side Gallery (1,3 km Duvar)",
     "tip": "Duvarın ayakta kalan en uzun parçası; 1990'da dünyanın dört bir yanından sanatçılar boyadı. Köprü ucundan Ostbahnhof'a doğru yürü: Brejnev ile Honecker'in “Kardeşlik Öpücüğü” ve duvarı delen Trabant en ünlüleri. Gün batımını (16:06) duvarın arkasındaki nehir kıyısında izle.",
     "cost": "Ücretsiz",
     "tags": [
      "must"
     ],
     "place": {
      "name": "East Side Gallery",
      "lat": 52.50445,
      "lng": 13.44084,
      "query": "East Side Gallery, Berlin"
     },
     "via": "walk",
     "scene": "gallery",
     "tod": "golden",
     "placeId": "sight-east-side-gallery"
    },
    {
     "id": "sat-raw",
     "start": 980,
     "end": 1020,
     "timeLabel": "16:20",
     "kind": "sight",
     "icon": "sight",
     "title": "RAW-Gelände ve Revaler Straße",
     "tip": "Eski demiryolu atölyesi: grafiti, kaykay salonu, Cassiopeia kulübü, Urban Spree galeri-kitapçı. Sokakta uyuşturucu satanlara yüz verme, telefon ve cüzdan önde.",
     "cost": "Ücretsiz",
     "tags": [
      "skipIfTired"
     ],
     "place": {
      "name": "RAW-Gelände",
      "lat": 52.50602,
      "lng": 13.456,
      "query": "RAW-Gelände, Revaler Straße 99, Berlin"
     },
     "via": "walk",
     "scene": "alley",
     "tod": "blue",
     "placeId": "sight-raw"
    },
    {
     "id": "sat-nap",
     "start": 1020,
     "end": 1290,
     "timeLabel": "17:00–21:30",
     "kind": "rest",
     "icon": "bed",
     "title": "Airbnb check-in, duş, uyku",
     "tip": "Bu uyku şart: 05:00'te kalktın, gece 04:00'e kadar ayaktasın. Alarm 21:30. Telefonu %100 şarj et.",
     "place": {
      "name": "Airbnb'n (örnek bölge)",
      "lat": 52.51115,
      "lng": 13.45678,
      "query": "Simon-Dach-Straße, Berlin"
     },
     "via": "walk",
     "bookingId": "airbnb",
     "scene": "hostel",
     "tod": "night"
    },
    {
     "id": "sat-dinner",
     "start": 1305,
     "end": 1350,
     "timeLabel": "21:45",
     "kind": "food",
     "icon": "food",
     "title": "Hafif akşam yemeği: Boxhagener Kiez",
     "tip": "Ağır yeme, bol su iç. Etraf Vietnam, falafel ve pizza dolu; Simon-Dach-Straße bir dakika ötede.",
     "cost": "€10–15",
     "place": {
      "name": "Boxhagener Platz",
      "lat": 52.51081,
      "lng": 13.4597,
      "query": "Boxhagener Platz, Berlin"
     },
     "via": "walk",
     "scene": "market",
     "tod": "night"
    },
    {
     "id": "sat-club-kit",
     "start": 1350,
     "timeLabel": "22:30",
     "kind": "task",
     "icon": "shirt",
     "title": "Kulüp hazırlığı",
     "tip": "Siyah tişört, siyah pantolon, rahat siyah ayakkabı; logo ve parlak renk yok. Yanına: pasaport, €40–60 nakit, kart, kulak tıkacı, küçük şarj. Mont vestiyere (€2–3).",
     "tags": [
      "must"
     ],
     "minor": true
    },
    {
     "id": "sat-to-rso",
     "start": 1395,
     "end": 1425,
     "timeLabel": "23:15",
     "kind": "move",
     "icon": "train",
     "title": "S9: Warschauer Str. → Schöneweide, 8 dk yürüyüş",
     "tip": "S9 ~13 dk; istasyondan Schnellerstraße boyunca 8–10 dk. Bilet: 24 saatlik “Berlin AB” (€11,20) şimdi başlat, Pazar gecesine kadar yeter.",
     "cost": "€11,20 (24 saat AB)",
     "place": {
      "name": "S Schöneweide",
      "lat": 52.45487,
      "lng": 13.50925,
      "query": "S Schöneweide, Berlin"
     },
     "via": {
      "line": "S9",
      "from": "Warschauer Straße",
      "to": "Schöneweide"
     },
     "minor": true
    },
    {
     "id": "sat-rso",
     "start": 1439,
     "end": 1680,
     "timeLabel": "23:59 → ~04:00",
     "kind": "night",
     "icon": "night",
     "title": "RSO.Berlin: Cumartesi gecesi",
     "tip": "Schöneweide'de dev bir endüstri yapısında, 2021'de açıldı: ROBUS ana salon, SUMME ikinci salon, özel Kirsch ses sistemi. Totensonntag nedeniyle dans yasağı 04:00'te başlıyor; müzik büyük ihtimalle o saatte durur. Saatleri Cuma 20 Kasım'da RA'dan ve RSO'nun Instagram'ından teyit et. İçeride fotoğraf yok.",
     "cost": "€20–30",
     "tags": [
      "must"
     ],
     "bookingId": "rso",
     "place": {
      "name": "RSO.Berlin (Revier Südost)",
      "lat": 52.46,
      "lng": 13.50527,
      "query": "RSO.Berlin, Schnellerstraße 137, Berlin"
     },
     "via": "walk",
     "scene": "club",
     "tod": "night",
     "links": [
      {
       "label": "RA: Berlin etkinlikleri",
       "url": "https://ra.co/events/de/berlin"
      }
     ],
     "placeId": "club-rso"
    },
    {
     "id": "sat-home",
     "start": 1680,
     "end": 1725,
     "timeLabel": "~04:00",
     "kind": "move",
     "icon": "train",
     "title": "Eve: S9 (hafta sonu bütün gece)",
     "tip": "Schöneweide → Warschauer Straße. Gece seferleri seyrek; çok beklersen Bolt/Uber ~€20–25.",
     "place": {
      "name": "Airbnb'n (örnek bölge)",
      "lat": 52.51115,
      "lng": 13.45678,
      "query": "Simon-Dach-Straße, Berlin"
     },
     "via": {
      "line": "S9",
      "from": "Schöneweide",
      "to": "Warschauer Straße"
     },
     "minor": true
    }
   ]
  },
  {
   "id": "sun",
   "date": "2026-11-22",
   "num": "XXII",
   "label": "Tarih",
   "title": "Sessiz Pazar: Duvar, Reichstag kubbesi, gece Berghain",
   "cover": {
    "scene": "perspective",
    "tod": "sunset"
   },
   "sun": {
    "rise": 461,
    "set": 965,
    "blueAm": [
     407,
     436
    ],
    "bluePm": [
     989,
     1018
    ]
   },
   "facts": [
    {
     "icon": "alert",
     "text": "Totensonntag: dans yasağı 04:00–21:00"
    },
    {
     "icon": "bag",
     "text": "Mağazalar kapalı; anıtlar ve müzeler açık"
    },
    {
     "icon": "sunset",
     "text": "Gün batımı 16:05: Reichstag kubbesinde"
    },
    {
     "icon": "night",
     "text": "Berghain: 21:00 sonrası (programa bak)"
    }
   ],
   "alerts": [
    {
     "from": 660,
     "to": 720,
     "icon": "bag",
     "text": "Pazar ve Totensonntag: süpermarketler kapalı. Su ve atıştırmalık için Späti (köşe bakkalı) ya da büyük istasyonlardaki marketler."
    },
    {
     "from": 900,
     "to": 945,
     "icon": "doc",
     "text": "Reichstag: slotundan 15 dk önce Scheidemannstraße'deki ziyaretçi girişinde ol, pasaport elinde. Güvenlik havalimanı gibi.",
     "tone": "warn"
    },
    {
     "from": 1230,
     "to": 1290,
     "icon": "shield",
     "text": "Berghain kapısı: tek, sakin, ayık, siyah. Kuyrukta telefonla oynama, fotoğraf çekme. Reddedilirsen tartışma, Plan B'ye geç."
    }
   ],
   "nearby": {
    "food": [
     {
      "name": "Silo Coffee",
      "sub": "Boxhagener Kiez'de brunch, Gabriel-Max-Str. 4",
      "query": "Silo Coffee, Gabriel-Max-Straße 4, Berlin",
      "scene": "espresso"
     },
     {
      "name": "Spätzle & Knödel",
      "sub": "peynirli Käsespätzle, Wühlischstraße 20",
      "query": "Spätzle & Knödel, Wühlischstraße 20, Berlin",
      "scene": "lasagna"
     },
     {
      "name": "Späti",
      "sub": "Pazar günü su, Club-Mate, atıştırmalık",
      "query": "Späti, Friedrichshain, Berlin",
      "scene": "market"
     }
    ],
    "photos": [
     "Holokost Anıtı'nın stelleri arasında",
     "Brandenburger Tor, Pariser Platz tarafından",
     "Reichstag kubbesinin sarmal rampası",
     "Topographie'deki Duvar parçası"
    ],
    "cards": [
     {
      "title": "Bugün neden sessiz?",
      "icon": "info",
      "items": [
       {
        "icon": "info",
        "text": "Totensonntag: ölüleri anma günü, “sessiz bayram”."
       },
       {
        "icon": "alert",
        "text": "04:00–21:00 arası dans etkinlikleri yasak."
       },
       {
        "icon": "landmark",
        "text": "Anıtlar, müzeler ve Reichstag açık; mağazalar kapalı."
       }
      ]
     }
    ]
   },
   "stops": [
    {
     "id": "sun-brunch",
     "start": 675,
     "end": 735,
     "timeLabel": "11:15",
     "kind": "food",
     "icon": "coffee",
     "title": "Brunch: Boxhagener Kiez",
     "tip": "Pazar brunch'ı Berlin'de gelenek: Silo Coffee (Gabriel-Max-Str. 4) ya da Boxhagener Platz çevresindeki kafeler. Sıra olur, biraz erken git.",
     "cost": "€15–20",
     "place": {
      "name": "Silo Coffee",
      "lat": 52.51014,
      "lng": 13.45837,
      "query": "Silo Coffee, Gabriel-Max-Straße 4, Berlin"
     },
     "via": "walk",
     "scene": "espresso",
     "tod": "day",
     "placeId": "food-silo"
    },
    {
     "id": "sun-to-kochstrasse",
     "start": 735,
     "end": 765,
     "timeLabel": "12:15",
     "kind": "move",
     "icon": "metro",
     "title": "U1 → Hallesches Tor, U6 → Kochstraße",
     "tip": "Warschauer Straße'den U1 (yer üstünden, Oberbaumbrücke'nin üst katından geçer), Hallesches Tor'da U6'ya aktar, bir durak. 24 saatlik bilet geçerli.",
     "place": {
      "name": "Kochstraße / Checkpoint Charlie",
      "lat": 52.50743,
      "lng": 13.39038,
      "query": "Checkpoint Charlie, Berlin"
     },
     "via": {
      "line": "U1 + U6",
      "from": "Warschauer Straße",
      "to": "Kochstraße"
     },
     "minor": true
    },
    {
     "id": "sun-checkpoint",
     "start": 765,
     "end": 780,
     "timeLabel": "12:45",
     "kind": "sight",
     "icon": "sight",
     "title": "Checkpoint Charlie",
     "tip": "Amerikan sınır kapısının kopyası; 5 dk ve bir fotoğraf yeter. Asıl hikâye: Ekim 1961'de Sovyet ve Amerikan tankları burada karşı karşıya geldi. Yanındaki özel müze pahalı ve kalabalık.",
     "cost": "Ücretsiz",
     "place": {
      "name": "Checkpoint Charlie",
      "lat": 52.50743,
      "lng": 13.39038,
      "query": "Checkpoint Charlie, Berlin"
     },
     "via": "walk",
     "scene": "perspective",
     "tod": "day",
     "placeId": "sight-checkpoint-charlie"
    },
    {
     "id": "sun-topographie",
     "start": 785,
     "end": 855,
     "timeLabel": "13:05–14:15",
     "kind": "sight",
     "icon": "landmark",
     "title": "Topographie des Terrors",
     "tip": "Gestapo ve SS genel merkezinin arsası. İçerideki sergi nazi terörünü belgeliyor; dışarıda 200 m'lik orijinal Duvar parçası. Her gün 10–20, ücretsiz.",
     "cost": "Ücretsiz",
     "tags": [
      "must"
     ],
     "place": {
      "name": "Topographie des Terrors",
      "lat": 52.50621,
      "lng": 13.38415,
      "query": "Topographie des Terrors, Niederkirchnerstraße 8, Berlin"
     },
     "via": "walk",
     "scene": "ruins",
     "tod": "day",
     "links": [
      {
       "label": "topographie.de",
       "url": "https://www.topographie.de"
      }
     ],
     "placeId": "sight-topographie"
    },
    {
     "id": "sun-potsdamer",
     "start": 860,
     "end": 875,
     "timeLabel": "14:20",
     "kind": "sight",
     "icon": "photo",
     "title": "Potsdamer Platz: Duvar parçaları",
     "tip": "Soğuk Savaş'ta ölü bölge olan meydan, bugün cam kuleler. İstasyon çıkışında birkaç orijinal Duvar segmenti duruyor.",
     "cost": "Ücretsiz",
     "tags": [
      "optional"
     ],
     "place": {
      "name": "Potsdamer Platz",
      "lat": 52.5098,
      "lng": 13.37559,
      "query": "Potsdamer Platz, Berlin"
     },
     "via": "walk",
     "scene": "skyline",
     "tod": "day"
    },
    {
     "id": "sun-holocaust",
     "start": 880,
     "end": 920,
     "timeLabel": "14:40–15:20",
     "kind": "sight",
     "icon": "landmark",
     "title": "Avrupa'nın Öldürülen Yahudileri Anıtı",
     "tip": "2.711 beton stel; ortaya doğru yürüdükçe zemin alçalır, şehir kaybolur. Stellerin üstüne çıkma, oturma, koşma. Altındaki bilgi merkezi (Ort der Information) Salı–Pazar 10–18, son giriş 17:15, ücretsiz.",
     "cost": "Ücretsiz",
     "tags": [
      "must"
     ],
     "place": {
      "name": "Holokost Anıtı",
      "lat": 52.51387,
      "lng": 13.37873,
      "query": "Denkmal für die ermordeten Juden Europas, Berlin"
     },
     "via": "walk",
     "scene": "perspective",
     "tod": "day",
     "links": [
      {
       "label": "stiftung-denkmal.de",
       "url": "https://www.stiftung-denkmal.de"
      }
     ],
     "placeId": "sight-holocaust-memorial"
    },
    {
     "id": "sun-brandenburg",
     "start": 920,
     "end": 935,
     "timeLabel": "15:20",
     "kind": "sight",
     "icon": "sight",
     "title": "Brandenburger Tor",
     "tip": "Duvar kapının hemen batısından geçiyordu; 1989'da kutlamaların simgesi oldu. Doğudaki Pariser Platz tarafından çek.",
     "cost": "Ücretsiz",
     "tags": [
      "must"
     ],
     "place": {
      "name": "Brandenburger Tor",
      "lat": 52.51627,
      "lng": 13.3777,
      "query": "Brandenburger Tor, Berlin"
     },
     "via": "walk",
     "scene": "perspective",
     "tod": "golden",
     "placeId": "sight-brandenburg-gate"
    },
    {
     "id": "sun-reichstag",
     "start": 945,
     "end": 1005,
     "timeLabel": "15:45–16:45",
     "kind": "sight",
     "icon": "landmark",
     "title": "Reichstag kubbesi: gün batımı",
     "tip": "Slotundan önce Scheidemannstraße'deki ziyaretçi girişinde güvenlik ve pasaport kontrolü. Ücretsiz sesli rehberi al, cam kubbenin sarmal rampasından yukarı çık. Gün batımı 16:05, mavi saat 16:30'dan sonra.",
     "cost": "Ücretsiz (kayıtla)",
     "tags": [
      "must"
     ],
     "bookingId": "reichstag",
     "place": {
      "name": "Reichstag kubbesi",
      "lat": 52.51865,
      "lng": 13.3761,
      "query": "Reichstagsgebäude, Platz der Republik 1, Berlin"
     },
     "via": "walk",
     "scene": "skyline",
     "tod": "sunset",
     "links": [
      {
       "label": "Bundestag: kubbe",
       "url": "https://www.bundestag.de/besuche/kuppel-245686"
      }
     ],
     "placeId": "sight-reichstag-dome"
    },
    {
     "id": "sun-back-east",
     "start": 1010,
     "end": 1050,
     "timeLabel": "16:50",
     "kind": "move",
     "icon": "train",
     "title": "S-Bahn: Brandenburger Tor → Warschauer Straße",
     "tip": "Brandenburger Tor'dan bir durak Friedrichstraße, orada doğuya giden S3/S5/S7/S9. Toplam ~25 dk.",
     "place": {
      "name": "Warschauer Straße",
      "lat": 52.50637,
      "lng": 13.45012,
      "query": "S+U Warschauer Straße, Berlin"
     },
     "via": {
      "line": "S-Bahn",
      "from": "Brandenburger Tor",
      "to": "Warschauer Straße"
     },
     "minor": true
    },
    {
     "id": "sun-dinner",
     "start": 1065,
     "end": 1125,
     "timeLabel": "17:45",
     "kind": "food",
     "icon": "food",
     "title": "Akşam: Käsespätzle",
     "tip": "Spätzle & Knödel (Wühlischstraße 20): peynirli Swabya eriştesi ve knödel, kulüp öncesi tam yakıt. Açılış saatine sabah bak; kapalıysa Boxhagener çevresinde Vietnam mutfağı.",
     "cost": "€15–20",
     "place": {
      "name": "Spätzle & Knödel",
      "lat": 52.50882,
      "lng": 13.46125,
      "query": "Spätzle & Knödel, Wühlischstraße 20, Berlin"
     },
     "via": "walk",
     "scene": "lasagna",
     "tod": "night",
     "placeId": "food-spaetzle"
    },
    {
     "id": "sun-rest",
     "start": 1125,
     "end": 1260,
     "timeLabel": "18:45–21:00",
     "kind": "rest",
     "icon": "bed",
     "title": "Dinlen, duş, kıyafet",
     "tip": "Uyuyabiliyorsan 1–1,5 saat uyu. Berghain için siyah, sade, rahat ayakkabı; €40–60 nakit.",
     "place": {
      "name": "Airbnb'n (örnek bölge)",
      "lat": 52.51115,
      "lng": 13.45678,
      "query": "Simon-Dach-Straße, Berlin"
     },
     "via": "walk",
     "scene": "hostel",
     "tod": "night",
     "minor": true
    },
    {
     "id": "sun-night",
     "start": 1275,
     "end": 1680,
     "timeLabel": "21:15 → geç",
     "kind": "night",
     "icon": "night",
     "title": "Pazar gecesi: Berghain",
     "tags": [
      "must"
     ],
     "place": {
      "name": "Berghain / Panorama Bar",
      "lat": 52.51117,
      "lng": 13.44304,
      "query": "Berghain, Am Wriezener Bahnhof, Berlin"
     },
     "via": "walk",
     "scene": "club",
     "tod": "night",
     "options": {
      "label": "Pazar gecesini seç",
      "default": "berghain",
      "helper": "Dans yasağı 21:00'de bitiyor. Cuma 20 Kasım'da Berghain programına bak: Pazar akşamı devam ediyorsa Berghain, yoksa RSO ya da RA'daki başka bir Pazar gecesi.",
      "note": "Kapıdan dönersen Ostkreuz'dan S9 ile Schöneweide'ye (RSO) ~20 dk.",
      "choices": [
       {
        "id": "berghain",
        "label": "Berghain",
        "title": "Berghain / Panorama Bar",
        "kind": "night",
        "icon": "night",
        "cost": "€25–30, kapıda",
        "place": {
         "name": "Berghain / Panorama Bar",
         "lat": 52.51117,
         "lng": 13.44304,
         "query": "Berghain, Am Wriezener Bahnhof, Berlin"
        },
        "via": "walk",
        "scene": "club",
        "tod": "night",
        "placeId": "club-berghain",
        "links": [
         {
          "label": "Berghain programı",
          "url": "https://www.berghain.berlin/en/program/"
         }
        ],
        "lines": [
         "Evinden 15 dk yürüme: Am Wriezener Bahnhof.",
         "Ön satış yok, kapıda kuyruk; Pazar akşamı genelde daha kısa.",
         "Alt katta Berghain (tekno), üst katta Panorama Bar (house).",
         "Kameraya sticker, içeride fotoğraf yasak. Nakit hazır olsun."
        ]
       },
       {
        "id": "rso-sunday",
        "label": "RSO",
        "title": "RSO.Berlin: Pazar devamı",
        "kind": "night",
        "icon": "night",
        "cost": "€15–30",
        "place": {
         "name": "RSO.Berlin (Revier Südost)",
         "lat": 52.46,
         "lng": 13.50527,
         "query": "RSO.Berlin, Schnellerstraße 137, Berlin"
        },
        "via": {
         "line": "S9",
         "from": "Warschauer Straße",
         "to": "Schöneweide"
        },
        "scene": "club",
        "tod": "night",
        "placeId": "club-rso",
        "links": [
         {
          "label": "RA: Berlin etkinlikleri",
          "url": "https://ra.co/events/de/berlin"
         }
        ],
        "lines": [
         "RSO hafta sonu partilerini çoğu zaman Pazar gecesine uzatır.",
         "Cumartesi gittiysen yeniden giriş için bilet gerekebilir.",
         "S9 ile 13 dk + 8 dk yürüyüş."
        ]
       },
       {
        "id": "rest-sunday",
        "label": "Dinlen",
        "title": "Erken yat, Pazartesi'ye sakla",
        "kind": "rest",
        "icon": "bed",
        "cost": "€0",
        "place": {
         "name": "Airbnb'n (örnek bölge)",
         "lat": 52.51115,
         "lng": 13.45678,
         "query": "Simon-Dach-Straße, Berlin"
        },
        "via": "walk",
        "scene": "hostel",
        "tod": "night",
        "lines": [
         "Pazartesi gecesi KitKat ve Tresor var.",
         "Simon-Dach-Straße'de bir bira, sonra uyku."
        ]
       }
      ]
     }
    },
    {
     "id": "sun-walk-home",
     "start": 1680,
     "end": 1695,
     "timeLabel": "~04:00",
     "kind": "move",
     "icon": "walk",
     "title": "Eve yürüyüş (15 dk)",
     "tip": "Berghain → Warschauer Straße → Simon-Dach-Straße, ışıklı caddelerden. Telefonun şarjı bitmesin.",
     "place": {
      "name": "Airbnb'n (örnek bölge)",
      "lat": 52.51115,
      "lng": 13.45678,
      "query": "Simon-Dach-Straße, Berlin"
     },
     "via": "walk",
     "minor": true
    }
   ]
  },
  {
   "id": "mon",
   "date": "2026-11-23",
   "num": "XXIII",
   "label": "Alışveriş",
   "title": "Alışveriş, Noel pazarlarının ilk günü, gece KitKat ve Tresor",
   "cover": {
    "scene": "market",
    "tod": "blue"
   },
   "sun": {
    "rise": 462,
    "set": 964,
    "blueAm": [
     409,
     438
    ],
    "bluePm": [
     988,
     1017
    ]
   },
   "facts": [
    {
     "icon": "star",
     "text": "Noel pazarları bugün açılıyor"
    },
    {
     "icon": "alert",
     "text": "TV Kulesi bugün kapalı (özel etkinlik)"
    },
    {
     "icon": "landmark",
     "text": "Müzelerin çoğu Pazartesi kapalı: alışveriş günü"
    },
    {
     "icon": "night",
     "text": "KitKat Electric Monday 22:00 · Tresor 23:00"
    }
   ],
   "alerts": [
    {
     "from": 720,
     "to": 765,
     "icon": "ticket",
     "text": "Yeni 24 saatlik AB biletini şimdi başlat (€11,20): bu gece ve Salı öğlene kadar yeter."
    },
    {
     "from": 1050,
     "to": 1095,
     "icon": "euro",
     "text": "Gendarmenmarkt girişi €2. Glühwein bardağına depozito ödenir: iade et ya da hatıra olarak sakla."
    },
    {
     "from": 1170,
     "to": 1230,
     "icon": "bag",
     "text": "Yarın check-out: çantanı bu akşam topla, Vueling check-in'ini yap."
    },
    {
     "from": 1320,
     "to": 1380,
     "icon": "camera",
     "text": "KitKat'ta Electric Monday gecesi telefon kesinlikle yasak: kuralı çiğneyen dışarı.",
     "tone": "warn"
    }
   ],
   "nearby": {
    "food": [
     {
      "name": "Hasir Kreuzberg",
      "sub": "Kotti'de döner, Adalbertstraße 10",
      "query": "Hasir Kreuzberg, Adalbertstraße 10, Berlin",
      "scene": "panino"
     },
     {
      "name": "Mustafa's Gemüse Kebap",
      "sub": "sebzeli döner, uzun kuyruk, Mehringdamm 32",
      "query": "Mustafa's Gemüse Kebap, Mehringdamm 32, Berlin",
      "scene": "panino"
     },
     {
      "name": "Curry 36",
      "sub": "klasik currywurst, Mehringdamm 36",
      "query": "Curry 36, Mehringdamm 36, Berlin",
      "scene": "panino"
     },
     {
      "name": "Rausch Schokoladenhaus",
      "sub": "çikolatadan Berlin simgeleri, Gendarmenmarkt'ın köşesi",
      "query": "Rausch Schokoladenhaus, Charlottenstraße 60, Berlin",
      "scene": "espresso"
     },
     {
      "name": "Monsieur Vuong",
      "sub": "Vietnam mutfağı, Alte Schönhauser Str. 46",
      "query": "Monsieur Vuong, Alte Schönhauser Straße 46, Berlin",
      "scene": "market"
     }
    ],
    "photos": [
     "Gendarmenmarkt ışıkları, mavi saat",
     "Hackesche Höfe avluları",
     "Kotti'nin yüksek blokları ve U1"
    ],
    "cards": [
     {
      "title": "KitKat Electric Monday",
      "icon": "shirt",
      "items": [
       {
        "icon": "shirt",
        "text": "Dress code rahat ama sade günlük değil: siyah üst, mesh, harness, deri, kinky sportswear."
       },
       {
        "icon": "camera",
        "text": "Telefon yok: içeride çıkarırsan dışarıdasın."
       },
       {
        "icon": "users",
        "text": "Rıza her şeydir: “hayır” ya da sessizlik hayır demek."
       },
       {
        "icon": "clock",
        "text": "Kapı 22:00; gece yarısından önce kuyruk kısa."
       }
      ]
     }
    ]
   },
   "stops": [
    {
     "id": "mon-lunch",
     "start": 750,
     "end": 795,
     "timeLabel": "12:30",
     "kind": "food",
     "icon": "food",
     "title": "Öğle: Kreuzberg döneri",
     "tip": "Kottbusser Tor'da Hasir (Adalbertstraße 10). Ekmek arası döner 1970'lerin Berlin'inde doğdu; Kadir Nurman da Hasir'in kurucusu Mehmet Aygün de mucidi olarak anılır. Alternatif: Mehringdamm'da Mustafa's (sebzeli, uzun kuyruk) ve Curry 36.",
     "cost": "€8–12",
     "place": {
      "name": "Hasir Kreuzberg",
      "lat": 52.50079,
      "lng": 13.41947,
      "query": "Hasir Kreuzberg, Adalbertstraße 10, Berlin"
     },
     "via": {
      "line": "U1",
      "from": "Warschauer Straße",
      "to": "Kottbusser Tor"
     },
     "scene": "panino",
     "tod": "day",
     "placeId": "food-hasir"
    },
    {
     "id": "mon-oranien",
     "start": 795,
     "end": 870,
     "timeLabel": "13:15–14:30",
     "kind": "sight",
     "icon": "bag",
     "title": "Oranienstraße ve Voo Store",
     "tip": "Kreuzberg'in ana caddesi: vintage, plak, kitap. Voo Store (Oranienstraße 24, avlunun içinde) Berlin'in en bilinen konsept mağazası; içinde Companion Coffee var.",
     "cost": "alışveriş",
     "place": {
      "name": "Voo Store",
      "lat": 52.50117,
      "lng": 13.42112,
      "query": "Voo Store, Oranienstraße 24, Berlin"
     },
     "via": "walk",
     "scene": "alley",
     "tod": "day",
     "placeId": "shop-voo"
    },
    {
     "id": "mon-hardwax",
     "start": 900,
     "end": 945,
     "timeLabel": "15:00–15:45",
     "kind": "sight",
     "icon": "speaker",
     "title": "Hard Wax (Kraftwerk, Tresor'un binası)",
     "tip": "1989'da Basic Channel'dan Mark Ernestus'un kurduğu, Berlin–Detroit tekno ekseninin plakçısı; 2023'ten beri Kraftwerk binasında (Köpenicker Str. 70). Pazartesi–Cumartesi 15–20 (değişebilir, sitesine bak). Dinleme pikabında sıra bekle; sessiz, ciddi bir yer.",
     "cost": "plak ~€12–20",
     "tags": [
      "must"
     ],
     "place": {
      "name": "Hard Wax @ Kraftwerk",
      "lat": 52.51068,
      "lng": 13.41948,
      "query": "Tresor, Köpenicker Straße 70, Berlin"
     },
     "via": "walk",
     "scene": "gallery",
     "tod": "day",
     "placeId": "shop-hard-wax"
    },
    {
     "id": "mon-shopping",
     "start": 960,
     "end": 1050,
     "timeLabel": "16:00–17:30",
     "kind": "sight",
     "icon": "bag",
     "title": "Alışveriş: Mitte mi, Batı mı?",
     "place": {
      "name": "Hackesche Höfe",
      "lat": 52.52427,
      "lng": 13.40172,
      "query": "Hackesche Höfe, Rosenthaler Straße 40, Berlin"
     },
     "via": {
      "line": "U8",
      "from": "Heinrich-Heine-Straße",
      "to": "Weinmeisterstraße"
     },
     "scene": "alley",
     "tod": "blue",
     "options": {
      "label": "Alışveriş bölgeni seç",
      "default": "mitte",
      "helper": "Hediyelik ve kıyafet için Mitte, büyük mağazalar için Batı. Gece KitKat'a gidiyorsan kıyafetini burada tamamla.",
      "choices": [
       {
        "id": "mitte",
        "label": "Mitte",
        "title": "Hackesche Höfe, Ampelmann, Torstraße",
        "kind": "sight",
        "icon": "bag",
        "cost": "alışveriş",
        "place": {
         "name": "Hackesche Höfe",
         "lat": 52.52427,
         "lng": 13.40172,
         "query": "Hackesche Höfe, Rosenthaler Straße 40, Berlin"
        },
        "via": {
         "line": "U8",
         "from": "Heinrich-Heine-Straße",
         "to": "Weinmeisterstraße"
        },
        "scene": "alley",
        "tod": "blue",
        "placeId": "shop-ampelmann",
        "lines": [
         "Hackesche Höfe: birbirine açılan sekiz avlu, küçük tasarım dükkânları.",
         "Ampelmann: Doğu Berlin'in trafik ışığı adamı, en klasik hediyelik.",
         "Torstraße 3: Schwarzer Reiter (fetiş ve kulüp kıyafeti).",
         "Alte Schönhauser ve Münzstraße: Berlin markaları, sneaker."
        ]
       },
       {
        "id": "west",
        "label": "Batı",
        "title": "KaDeWe, Bikini Berlin, Ku'damm",
        "kind": "sight",
        "icon": "bag",
        "cost": "alışveriş",
        "place": {
         "name": "KaDeWe",
         "lat": 52.50158,
         "lng": 13.341,
         "query": "KaDeWe, Tauentzienstraße 21, Berlin"
        },
        "via": {
         "line": "U2",
         "from": "Alexanderplatz",
         "to": "Wittenbergplatz"
        },
        "scene": "skyline",
        "tod": "blue",
        "placeId": "shop-kadewe",
        "lines": [
         "KaDeWe: 1907'den beri; 6. kat gurme katı tek başına gezilir.",
         "Bikini Berlin: hayvanat bahçesine bakan konsept alışveriş merkezi.",
         "Kaiser-Wilhelm-Gedächtniskirche: bombalanmış kule, savaşın anıtı.",
         "Sonra Gendarmenmarkt'a U-Bahn ile ~20 dk."
        ]
       },
       {
        "id": "outfit",
        "label": "Kıyafet",
        "title": "KitKat kıyafeti: fetiş ve kulüp dükkânları",
        "kind": "sight",
        "icon": "shirt",
        "cost": "€30–100",
        "place": {
         "name": "Schwarzer Reiter",
         "lat": 52.5276,
         "lng": 13.41496,
         "query": "Schwarzer Reiter, Torstraße 3, Berlin"
        },
        "via": {
         "line": "U8",
         "from": "Heinrich-Heine-Straße",
         "to": "Rosenthaler Platz"
        },
        "scene": "alley",
        "tod": "blue",
        "lines": [
         "Schwarzer Reiter (Torstraße 3, Mitte): fetiş ve kulüp kıyafeti.",
         "Blackstyle (Seelower Str. 5, Prenzlauer Berg): lateks ve deri.",
         "Mister B (Motzstraße 22, Schöneberg): erkek fetiş kıyafeti.",
         "En basiti: siyah mesh tişört ya da bir harness yeter."
        ]
       }
      ]
     }
    },
    {
     "id": "mon-gendarmenmarkt",
     "start": 1065,
     "end": 1155,
     "timeLabel": "17:45–19:15",
     "kind": "sight",
     "icon": "star",
     "title": "Gendarmenmarkt Noel pazarı: açılış günü",
     "tip": "WeihnachtsZauber, iki katedral ile Konzerthaus arasında, Berlin'in en şık pazarı; bugün sezonun ilk günü. Akşam yemeği burada: Bratwurst, Reibekuchen (patates köftesi, elma püresiyle), Flammkuchen; yanında Glühwein. Köşede Rausch Schokoladenhaus.",
     "cost": "€2 giriş + €20–25",
     "tags": [
      "must"
     ],
     "place": {
      "name": "Gendarmenmarkt",
      "lat": 52.51357,
      "lng": 13.3923,
      "query": "Weihnachtsmarkt Gendarmenmarkt, Berlin"
     },
     "via": "ride",
     "scene": "market",
     "tod": "blue",
     "links": [
      {
       "label": "berlin.de: Noel pazarları",
       "url": "https://www.berlin.de/en/christmas-markets/mitte/"
      }
     ],
     "placeId": "xmas-gendarmenmarkt"
    },
    {
     "id": "mon-rest",
     "start": 1170,
     "end": 1320,
     "timeLabel": "19:30–22:00",
     "kind": "rest",
     "icon": "bed",
     "title": "Eve: duş, çanta, kısa uyku",
     "tip": "Yarın check-out var: çantanı şimdi topla, sabah sadece kapat. Bir saatlik uyku bile fark eder.",
     "place": {
      "name": "Airbnb'n (örnek bölge)",
      "lat": 52.51115,
      "lng": 13.45678,
      "query": "Simon-Dach-Straße, Berlin"
     },
     "via": {
      "line": "S-Bahn",
      "from": "Friedrichstraße",
      "to": "Warschauer Straße"
     },
     "scene": "hostel",
     "tod": "night",
     "minor": true
    },
    {
     "id": "mon-night",
     "start": 1350,
     "end": 1740,
     "timeLabel": "22:30 → sabah",
     "kind": "night",
     "icon": "night",
     "title": "Pazartesi gecesi: KitKat ve Tresor",
     "tags": [
      "must"
     ],
     "place": {
      "name": "KitKatClub",
      "lat": 52.51121,
      "lng": 13.41692,
      "query": "KitKatClub, Köpenicker Straße 76, Berlin"
     },
     "via": {
      "line": "S-Bahn",
      "from": "Warschauer Straße",
      "to": "Jannowitzbrücke"
     },
     "scene": "club",
     "tod": "night",
     "options": {
      "label": "Gecenin sırasını seç",
      "default": "kitkat-first",
      "helper": "İkisi de Köpenicker Straße'de, 3 dk arayla. Sert tekno için Tresor'un bodrumu, deneyim için KitKat.",
      "note": "Hafta içi gecesi: U-Bahn ~01:00'de durur, ~04:30'da başlar. Arada gece otobüsü (N hatları) ya da Bolt/Uber ~€12–18.",
      "choices": [
       {
        "id": "kitkat-first",
        "label": "KitKat → Tresor",
        "title": "Önce KitKat (Electric Monday), ~02:00 Tresor",
        "kind": "night",
        "icon": "night",
        "cost": "€10–20 + €10–20",
        "place": {
         "name": "KitKatClub",
         "lat": 52.51121,
         "lng": 13.41692,
         "query": "KitKatClub, Köpenicker Straße 76, Berlin"
        },
        "via": {
         "line": "S-Bahn",
         "from": "Warschauer Straße",
         "to": "Jannowitzbrücke"
        },
        "scene": "club",
        "tod": "night",
        "placeId": "club-kitkat",
        "links": [
         {
          "label": "KitKatClub",
          "url": "https://www.kitkat.club"
         }
        ],
        "lines": [
         "22:30–23:00 KitKat kapısı: kuyruk kısa, kıyafet kontrolü var.",
         "Tekno ve house, havuzlu ana salon; telefon kesinlikle yasak.",
         "~02:00 çık, 3 dk yürü: Tresor “Singularity”, bodrumda sert tekno.",
         "Her kulübe ayrı giriş ücreti."
        ]
       },
       {
        "id": "tresor-first",
        "label": "Tresor → KitKat",
        "title": "Önce Tresor, ~02:30 KitKat",
        "kind": "night",
        "icon": "night",
        "cost": "€10–20 + €10–20",
        "place": {
         "name": "Tresor (Kraftwerk)",
         "lat": 52.51068,
         "lng": 13.41948,
         "query": "Tresor, Köpenicker Straße 70, Berlin"
        },
        "via": {
         "line": "S-Bahn",
         "from": "Warschauer Straße",
         "to": "Jannowitzbrücke"
        },
        "scene": "club",
        "tod": "night",
        "placeId": "club-tresor",
        "links": [
         {
          "label": "Tresor",
          "url": "https://tresorberlin.com"
         }
        ],
        "lines": [
         "23:00 Tresor açılışı: kasa bodrumunda sert tekno, üstte Globus.",
         "KitKat gece ilerledikçe daha çılgın; geç giriş de olur.",
         "Kıyafet kontrolü KitKat'ta var, Tresor'da yok."
        ]
       },
       {
        "id": "tresor-only",
        "label": "Sadece Tresor",
        "title": "Sadece Tresor, 03:00'te eve",
        "kind": "night",
        "icon": "night",
        "cost": "€10–20",
        "place": {
         "name": "Tresor (Kraftwerk)",
         "lat": 52.51068,
         "lng": 13.41948,
         "query": "Tresor, Köpenicker Straße 70, Berlin"
        },
        "via": {
         "line": "S-Bahn",
         "from": "Warschauer Straße",
         "to": "Jannowitzbrücke"
        },
        "scene": "club",
        "tod": "night",
        "placeId": "club-tresor",
        "lines": [
         "Yarın sabah Duvar Anıtı ve uçuş var: enerjini koru.",
         "Tresor'da 3–4 saat, sonra eve."
        ]
       }
      ]
     }
    },
    {
     "id": "mon-home",
     "start": 1740,
     "end": 1770,
     "timeLabel": "~05:00",
     "kind": "move",
     "icon": "taxi",
     "title": "Eve: S-Bahn yeniden çalışıyor ya da taksi",
     "tip": "~04:30'dan sonra S-Bahn yeniden başlar: Jannowitzbrücke → Warschauer Straße. Daha erken çıkarsan gece otobüsü ya da Bolt/Uber (~€12–18). Alarm 09:30.",
     "place": {
      "name": "Airbnb'n (örnek bölge)",
      "lat": 52.51115,
      "lng": 13.45678,
      "query": "Simon-Dach-Straße, Berlin"
     },
     "via": "ride",
     "minor": true
    }
   ]
  },
  {
   "id": "tue",
   "date": "2026-11-24",
   "num": "XXIV",
   "label": "Duvar ve dönüş",
   "title": "Bernauer Straße, TV Kulesi'nde gün batımı, eve uçuş",
   "cover": {
    "scene": "skyline",
    "tod": "sunset"
   },
   "sun": {
    "rise": 464,
    "set": 963,
    "blueAm": [
     410,
     439
    ],
    "bluePm": [
     987,
     1016
    ]
   },
   "facts": [
    {
     "icon": "bed",
     "text": "Check-out (çoğu ilanda 10:00–11:00)"
    },
    {
     "icon": "sunset",
     "text": "Gün batımı 16:03: TV Kulesi'nde"
    },
    {
     "icon": "plane",
     "text": "VY2003 20:40 BER → 23:20 BCN"
    },
    {
     "icon": "bag",
     "text": "Vueling Basic: tek çanta 40×30×20"
    }
   ],
   "alerts": [
    {
     "from": 570,
     "to": 615,
     "icon": "bed",
     "text": "Check-out: pasaport, şarj aleti, anahtar. Çanta 40×30×20'ye sığıyor mu?",
     "tone": "warn"
    },
    {
     "from": 900,
     "to": 930,
     "icon": "clock",
     "text": "TV Kulesi slotun ~15:30: güvenlik ve asansör için 10 dk erken ol."
    },
    {
     "from": 1095,
     "to": 1120,
     "icon": "train",
     "text": "18:40'ta havalimanı yolunda ol: RE7/RB14 Alexanderplatz'tan ~30 dk, S9 ~45 dk.",
     "tone": "warn"
    },
    {
     "from": 1180,
     "to": 1220,
     "icon": "plane",
     "text": "Vueling'de kapı kalkıştan ~20 dk önce kapanır; çanta ölçüsü kapıda kontrol edilebilir."
    }
   ],
   "journey": {
    "title": "Eve dönüş",
    "nodes": [
     {
      "time": "18:40",
      "name": "Alexanderplatz",
      "sub": "RE7 / RB14 ya da S9",
      "mode": ""
     },
     {
      "time": "~19:15",
      "name": "BER Terminal 1",
      "sub": "güvenlik, kapı",
      "mode": "ride"
     },
     {
      "time": "23:20",
      "name": "Barcelona T1",
      "sub": "eve",
      "mode": "fly",
      "label": "VY2003 20:40"
     }
    ]
   },
   "nearby": {
    "food": [
     {
      "name": "Konnopke's Imbiß",
      "sub": "1930'dan beri currywurst, U2 raylarının altı",
      "query": "Konnopke's Imbiß, Schönhauser Allee 44b, Berlin",
      "scene": "panino"
     },
     {
      "name": "Rotes Rathaus Noel pazarı",
      "sub": "Bratwurst, Reibekuchen, Glühwein",
      "query": "Weihnachtsmarkt Rotes Rathaus, Berlin",
      "scene": "market"
     },
     {
      "name": "Zur letzten Instanz",
      "sub": "1621'den beri, Berlin'in en eski restoranı",
      "query": "Zur letzten Instanz, Waisenstraße 14, Berlin",
      "scene": "lasagna"
     }
    ],
    "photos": [
     "TV Kulesi'nden gün batımı",
     "Bernauer Straße'de ölüm şeridi, seyir terasından",
     "Berliner Dom ve Spree, mavi saat"
    ],
    "cards": [
     {
      "title": "Havalimanına giderken",
      "icon": "plane",
      "items": [
       {
        "icon": "ticket",
        "text": "ABC tek bilet (€5); BER C bölgesinde."
       },
       {
        "icon": "doc",
        "text": "Pasaport ve TIE elinde."
       },
       {
        "icon": "bag",
        "text": "Sıvılar 100 ml, tek şeffaf poşet."
       }
      ]
     }
    ]
   },
   "stops": [
    {
     "id": "tue-checkout",
     "start": 615,
     "end": 630,
     "timeLabel": "10:15",
     "kind": "task",
     "icon": "bed",
     "title": "Check-out",
     "tip": "Anahtarı ev sahibinin tarif ettiği yere bırak. Çantayı gün boyu taşımak istemezsen Alexanderplatz ya da Ostbahnhof çevresinde Bounce/Radical Storage gibi emanet servisleri (~€5–8).",
     "place": {
      "name": "Airbnb'n (örnek bölge)",
      "lat": 52.51115,
      "lng": 13.45678,
      "query": "Simon-Dach-Straße, Berlin"
     },
     "bookingId": "airbnb",
     "minor": true
    },
    {
     "id": "tue-to-mauer",
     "start": 630,
     "end": 665,
     "timeLabel": "10:30",
     "kind": "move",
     "icon": "train",
     "title": "Tramvay M10: Warschauer Str. → Bernauer Straße",
     "tip": "M10 aktarmasız, ~30 dk; Bernauer Straße'deki anıt durağında in. Dün başlattığın 24 saatlik bilet öğlene kadar geçerli.",
     "place": {
      "name": "Berlin Duvarı Anıtı",
      "lat": 52.53582,
      "lng": 13.39085,
      "query": "Gedenkstätte Berliner Mauer, Bernauer Straße 119, Berlin"
     },
     "via": {
      "line": "M10",
      "from": "Warschauer Straße",
      "to": "Gedenkstätte Berliner Mauer"
     },
     "minor": true
    },
    {
     "id": "tue-mauer",
     "start": 665,
     "end": 755,
     "timeLabel": "11:05–12:35",
     "kind": "sight",
     "icon": "landmark",
     "title": "Berlin Duvarı Anıtı (Bernauer Straße)",
     "tip": "Duvar'ı anlamak için en iyi yer: 1,4 km'lik açık hava sergisi (her gün 8–22), orijinal sınır şeridi ve gözetleme kulesi, ölenlerin portrelerinin olduğu Anma Penceresi, Uzlaşma Şapeli, yere işlenmiş kaçış tünelleri. Dokümantasyon merkezinin seyir terası (Salı–Pazar 10–18) ölüm şeridini yukarıdan gösterir. Ücretsiz.",
     "cost": "Ücretsiz",
     "tags": [
      "must"
     ],
     "place": {
      "name": "Berlin Duvarı Anıtı",
      "lat": 52.53582,
      "lng": 13.39085,
      "query": "Gedenkstätte Berliner Mauer, Bernauer Straße 119, Berlin"
     },
     "via": "walk",
     "scene": "ruins",
     "tod": "day",
     "links": [
      {
       "label": "stiftung-berliner-mauer.de",
       "url": "https://www.stiftung-berliner-mauer.de"
      }
     ],
     "placeId": "sight-wall-memorial"
    },
    {
     "id": "tue-mauerpark",
     "start": 755,
     "end": 775,
     "timeLabel": "12:35",
     "kind": "sight",
     "icon": "walk",
     "title": "Mauerpark üzerinden yürü",
     "tip": "Eski ölüm şeridi bugün park; duvar parçasındaki grafitiler sürekli yenilenir. Eberswalder Straße'ye ~15 dk.",
     "tags": [
      "optional"
     ],
     "place": {
      "name": "Mauerpark",
      "lat": 52.54372,
      "lng": 13.40193,
      "query": "Mauerpark, Berlin"
     },
     "via": "walk",
     "scene": "alley",
     "tod": "day",
     "minor": true
    },
    {
     "id": "tue-konnopke",
     "start": 780,
     "end": 820,
     "timeLabel": "13:00",
     "kind": "food",
     "icon": "food",
     "title": "Konnopke's Imbiß: currywurst",
     "tip": "1930'dan beri U2 raylarının altında. “Mit oder ohne Darm?” (kabuklu mu, kabuksuz mu) diye sorabilirler; kabuksuz Doğu Berlin usulü. Saatler kaynaklara göre değişiyor; kapalıysa birkaç yüz metre güneyde Ziervogel's Kult-Curry (Schönhauser Allee 20).",
     "cost": "€5–8",
     "place": {
      "name": "Konnopke's Imbiß",
      "lat": 52.54047,
      "lng": 13.41222,
      "query": "Konnopke's Imbiß, Schönhauser Allee 44b, Berlin"
     },
     "via": "walk",
     "scene": "panino",
     "tod": "day",
     "placeId": "food-konnopke"
    },
    {
     "id": "tue-afternoon",
     "start": 840,
     "end": 915,
     "timeLabel": "14:00–15:15",
     "kind": "sight",
     "icon": "landmark",
     "title": "Öğleden sonra: Nefertiti mi, DDR mi?",
     "place": {
      "name": "Neues Museum",
      "lat": 52.52016,
      "lng": 13.39774,
      "query": "Neues Museum, Bodestraße 1, Berlin"
     },
     "via": {
      "line": "U2",
      "from": "Eberswalder Straße",
      "to": "Alexanderplatz"
     },
     "scene": "gallery",
     "tod": "day",
     "options": {
      "label": "Öğleden sonranı seç",
      "default": "neues",
      "helper": "TV Kulesi'ne yürüme mesafesinde üç seçenek. Gece uykusuz geçtiyse dinlen.",
      "choices": [
       {
        "id": "neues",
        "label": "Neues Museum",
        "title": "Neues Museum: Nefertiti büstü",
        "kind": "sight",
        "icon": "landmark",
        "cost": "€14",
        "place": {
         "name": "Neues Museum",
         "lat": 52.52016,
         "lng": 13.39774,
         "query": "Neues Museum, Bodestraße 1, Berlin"
        },
        "via": {
         "line": "U2",
         "from": "Eberswalder Straße",
         "to": "Alexanderplatz"
        },
        "scene": "gallery",
        "tod": "day",
        "bookingId": "neues",
        "placeId": "sight-neues-museum",
        "links": [
         {
          "label": "SMB biletleri",
          "url": "https://www.smb.museum/museen-einrichtungen/neues-museum/besuch-planen/preise-tickets/"
         }
        ],
        "lines": [
         "Mısır koleksiyonu ve 3.300 yıllık Nefertiti büstü; büstün odasında fotoğraf yasak.",
         "Savaşta yıkılan bina, David Chipperfield'in yeniden inşasıyla başlı başına eser.",
         "Salı–Pazar 10–18; zaman dilimli online bilet."
        ]
       },
       {
        "id": "ddr",
        "label": "DDR Museum",
        "title": "DDR Museum: Doğu Almanya'da gündelik hayat",
        "kind": "sight",
        "icon": "landmark",
        "cost": "fiyatı sitesinde",
        "place": {
         "name": "DDR Museum",
         "lat": 52.51944,
         "lng": 13.40224,
         "query": "DDR Museum, Karl-Liebknecht-Straße 1, Berlin"
        },
        "via": {
         "line": "U2",
         "from": "Eberswalder Straße",
         "to": "Alexanderplatz"
        },
        "scene": "gallery",
        "tod": "day",
        "placeId": "sight-ddr-museum",
        "lines": [
         "Dokunmalı, etkileşimli: bir Trabant'a bin, Plattenbau dairesine gir.",
         "Spree kıyısında, Berliner Dom'un karşısında."
        ]
       },
       {
        "id": "cafe",
        "label": "Dinlen",
        "title": "Kafede dinlen, Spree boyunca yürü",
        "kind": "rest",
        "icon": "coffee",
        "cost": "€5–10",
        "place": {
         "name": "Lustgarten ve Berliner Dom",
         "lat": 52.51854,
         "lng": 13.3994,
         "query": "Lustgarten, Berlin"
        },
        "via": {
         "line": "U2",
         "from": "Eberswalder Straße",
         "to": "Alexanderplatz"
        },
        "scene": "espresso",
        "tod": "day",
        "lines": [
         "Gece uykusuz geçtiyse en akıllısı bu.",
         "Lustgarten'dan Dom'a ve Altes Museum'a bak; TV Kulesi'ne 10 dk."
        ]
       }
      ]
     }
    },
    {
     "id": "tue-tvtower",
     "start": 930,
     "end": 990,
     "timeLabel": "15:30–16:30",
     "kind": "sight",
     "icon": "landmark",
     "title": "TV Kulesi (Fernsehturm): gün batımı",
     "tip": "203 m'deki seyir katından 360° Berlin; gün batımı 16:03, ardından şehrin ışıkları. Online bilet zaman dilimli ve gişeden ucuz. Şiddetli rüzgârda ya da buzlanmada seyir katı kapanabilir. 23 Kasım'da kule kapalı olduğu için bugüne koyduk.",
     "cost": "€26,50+",
     "tags": [
      "must"
     ],
     "bookingId": "tvtower",
     "place": {
      "name": "TV Kulesi (Fernsehturm)",
      "lat": 52.52083,
      "lng": 13.40942,
      "query": "Berliner Fernsehturm, Panoramastraße 1A, Berlin"
     },
     "via": "walk",
     "scene": "skyline",
     "tod": "sunset",
     "links": [
      {
       "label": "tv-turm.de",
       "url": "https://tv-turm.de/en/"
      }
     ],
     "placeId": "sight-tv-tower"
    },
    {
     "id": "tue-market",
     "start": 1005,
     "end": 1095,
     "timeLabel": "16:45–18:15",
     "kind": "food",
     "icon": "star",
     "title": "Rotes Rathaus Noel pazarı ve son akşam yemeği",
     "tip": "Kulenin dibinde: dönme dolap, Neptün Çeşmesi'nin çevresinde buz pisti, giriş ücretsiz. Son Berlin yemeği: Bratwurst ya da Grünkohl, Reibekuchen; bir Glühwein (alkolsüzü Kinderpunsch). Uçuştan önce bir tane yeter.",
     "cost": "€15–25",
     "tags": [
      "must"
     ],
     "place": {
      "name": "Rotes Rathaus Noel pazarı",
      "lat": 52.51827,
      "lng": 13.40783,
      "query": "Weihnachtsmarkt Rotes Rathaus, Berlin"
     },
     "via": "walk",
     "scene": "market",
     "tod": "night",
     "placeId": "xmas-rotes-rathaus"
    },
    {
     "id": "tue-to-ber",
     "start": 1120,
     "end": 1160,
     "timeLabel": "18:40",
     "kind": "move",
     "icon": "train",
     "title": "Alexanderplatz → BER: RE7 / RB14 ya da S9",
     "tip": "Bölge trenleri (RE7/RB14) ~30 dk ama saatte bir iki sefer: DB Navigator'da saatine bak. S9 daha sık, ~45 dk. Bilet: ABC tek bilet €5. BER istasyonu terminalin altında.",
     "cost": "€5",
     "place": {
      "name": "BER Terminal 1",
      "lat": 52.3658,
      "lng": 13.48889,
      "query": "Flughafen BER Terminal 1, Schönefeld"
     },
     "via": {
      "line": "RE7",
      "from": "Alexanderplatz",
      "to": "Flughafen BER"
     },
     "offToAirport": true
    },
    {
     "id": "tue-ber-security",
     "start": 1160,
     "end": 1215,
     "timeLabel": "19:20",
     "kind": "task",
     "icon": "shield",
     "title": "BER T1: güvenlik ve kapı",
     "tip": "Schengen içi uçuş: pasaport kontrolü yok ama kimliğin elinde olsun. Çantan ölçüye uyuyor mu? Kapı kalkıştan ~20 dk önce kapanır.",
     "place": {
      "name": "BER Terminal 1",
      "lat": 52.3658,
      "lng": 13.48889,
      "query": "Flughafen BER Terminal 1, Schönefeld"
     },
     "minor": true
    },
    {
     "id": "tue-vy2003",
     "start": 1240,
     "end": 1400,
     "timeLabel": "20:40–23:20",
     "kind": "move",
     "icon": "flight",
     "title": "VY2003 Berlin BER → Barcelona",
     "tip": "Barcelona Terminal 1'e iniş 23:20. Eve Aerobus ya da taksi. Ertesi gün işe gidiyorsan erken yat.",
     "bookingId": "flights",
     "scene": "plane",
     "tod": "night"
    }
   ]
  }
 ],
 "bookings": [
  {
   "id": "flights",
   "due": "2026-11-14",
   "dueLabel": "Hemen",
   "asap": true,
   "key": "Uçuş",
   "title": "Uçuşlar: Cmt 21 LH1817 + LH1952, Sal 24 VY2003",
   "detail": "Gidiş BCN 07:30 → MUC 09:30, MUC 11:00 → BER 12:10 (Lufthansa, tek bilet). Dönüş BER 20:40 → BCN 23:20 (Vueling). 13 Kasım'da Google Flights: gidiş €144, dönüş €67 (tek yön, bir kişi); Google gidiş fiyatını “yüksek” gösteriyor, beklemek pahalıya patlayabilir. Vueling Basic'te tek ücretsiz çanta 40×30×20.",
   "cost": "~€211",
   "links": [
    {
     "label": "Gidiş (Google Flights)",
     "url": "https://www.google.com/travel/flights?q=Flights%20to%20BER%20from%20BCN%20on%202026-11-21%20oneway"
    },
    {
     "label": "Dönüş (Google Flights)",
     "url": "https://www.google.com/travel/flights?q=Flights%20to%20BCN%20from%20BER%20on%202026-11-24%20oneway"
    }
   ],
   "scene": {
    "scene": "plane",
    "tod": "day"
   }
  },
  {
   "id": "airbnb",
   "due": "2026-11-14",
   "dueLabel": "Hemen",
   "asap": true,
   "key": "Airbnb",
   "title": "Airbnb: Friedrichshain, Cmt 21 → Sal 24 Kas (3 gece), tek kişi",
   "detail": "En iyi bölge Warschauer Straße, Ostkreuz ve Boxhagener Platz arası: Berghain'e yürüyüş, RSO'ya S9, BER'e S9/FEX. Toplam fiyatta temizlik ücreti ve Berlin konaklama vergisi (net fiyatın %7,5'i) olsun. Ev sahibine erken çanta bırakmayı ve geç check-out'u sor. Adresini bu plana yazmıyoruz (repo herkese açık): uygulamada evini kendin düzeltebilirsin.",
   "cost": "ilana göre + %7,5 vergi",
   "links": [
    {
     "label": "Airbnb araması",
     "url": "https://www.airbnb.com/s/Friedrichshain--Berlin--Germany/homes?checkin=2026-11-21&checkout=2026-11-24&adults=1"
    }
   ],
   "scene": {
    "scene": "hostel",
    "tod": "night"
   }
  },
  {
   "id": "reichstag",
   "due": "2026-11-15",
   "dueLabel": "Bu hafta sonu",
   "asap": true,
   "key": "Reichstag",
   "title": "Reichstag kubbesi: Paz 22 Kas, 15:45 (ücretsiz kayıt)",
   "detail": "Bundestag'ın sitesindeki formla: ad, soyad, doğum tarihi; onay e-postası gelir. 15:30–16:00 arası her slot olur (gün batımı 16:05). Pasaportla git. Dolarsa: Scheidemannstraße'deki servis noktasında sonraki iki gün için yerinde kayıt da yapılabiliyor (pasaportla).",
   "cost": "Ücretsiz",
   "links": [
    {
     "label": "Bundestag: kubbe ziyareti",
     "url": "https://www.bundestag.de/besuche/kuppel-245686"
    }
   ],
   "scene": {
    "scene": "skyline",
    "tod": "sunset"
   }
  },
  {
   "id": "checkin-lh",
   "due": "2026-11-20",
   "dueLabel": "Cuma 20, ~08:30",
   "key": "LH check-in",
   "title": "Lufthansa online check-in",
   "detail": "Kalkıştan 23 saat önce açılır. Lufthansa uygulamasında iki uçuşun biniş kartı birlikte gelir; Wallet'a ekle.",
   "cost": "Ücretsiz",
   "links": [
    {
     "label": "lufthansa.com",
     "url": "https://www.lufthansa.com"
    }
   ]
  },
  {
   "id": "rso",
   "due": "2026-11-20",
   "dueLabel": "Cuma 20",
   "key": "RSO",
   "title": "RSO Cumartesi gecesi: bilet ve saatler",
   "detail": "RA'da Cumartesi 21 Kasım RSO etkinliğini bul, bileti oradan al (kapıda da satılabilir ama garanti değil). Totensonntag nedeniyle bitiş 04:00 olabilir: etkinlik sayfasındaki saatleri oku. Cuma 20 Kasım gecesi RSO'nun 5. yıl partisi (Year Five).",
   "cost": "€20–30",
   "links": [
    {
     "label": "RA: Berlin etkinlikleri",
     "url": "https://ra.co/events/de/berlin"
    }
   ],
   "scene": {
    "scene": "club",
    "tod": "night"
   }
  },
  {
   "id": "berghain-check",
   "due": "2026-11-20",
   "dueLabel": "Cuma 20",
   "key": "Berghain",
   "title": "Berghain'in Pazar programına bak",
   "detail": "Berghain hafta sonu programını sitesinde yayınlar. Totensonntag nedeniyle Pazar 21:00'den önce dans yok; Pazar akşamı devam edip etmediğini buradan gör. Ön satış yok, kapıda ödenir: nakit hazır olsun.",
   "cost": "€25–30 kapıda",
   "links": [
    {
     "label": "Berghain programı",
     "url": "https://www.berghain.berlin/en/program/"
    }
   ],
   "scene": {
    "scene": "club",
    "tod": "night"
   }
  },
  {
   "id": "tvtower",
   "due": "2026-11-20",
   "dueLabel": "Cuma 20'ye kadar",
   "key": "TV Kulesi",
   "title": "TV Kulesi: Sal 24 Kas, ~15:30 slot",
   "detail": "Online zaman dilimli bilet, gün batımı 16:03. Kule 23 Kasım'da kapalı. Rüzgârda ya da buzlanmada seyir katı kapanabilir: iade koşullarına bakarak al.",
   "cost": "€26,50+",
   "links": [
    {
     "label": "tv-turm.de",
     "url": "https://tv-turm.de/en/"
    }
   ],
   "scene": {
    "scene": "skyline",
    "tod": "sunset"
   }
  },
  {
   "id": "apps",
   "due": "2026-11-20",
   "dueLabel": "Gitmeden",
   "key": "Uygulamalar",
   "title": "Uygulamalar: BVG Tickets, DB Navigator, RA, Bolt/Uber",
   "detail": "BVG Tickets: biletler (kartını ekle). BVG Fahrinfo ya da Google Maps: güzergâh. DB Navigator: RE7/RB14/FEX saatleri. RA: parti saatleri ve biletler. Bolt, Uber ya da FreeNow: gece taksi.",
   "cost": "Ücretsiz",
   "links": [
    {
     "label": "BVG",
     "url": "https://www.bvg.de"
    }
   ]
  },
  {
   "id": "kitkat-outfit",
   "due": "2026-11-20",
   "dueLabel": "Gitmeden",
   "key": "KitKat",
   "title": "KitKat için bir parça: mesh üst, harness ya da deri",
   "detail": "Electric Monday'de dress code rahat ama sade günlük kıyafetle girmek zor. Barcelona'dan bir parça getir ya da Pazartesi Mitte'de Schwarzer Reiter'e uğra.",
   "cost": "€20–60"
  },
  {
   "id": "neues",
   "due": "2026-11-23",
   "dueLabel": "Pzt 23",
   "key": "Neues Museum",
   "title": "Neues Museum: Sal 24 Kas, 14:00 (isteğe bağlı)",
   "cost": "€14",
   "links": [
    {
     "label": "SMB biletleri",
     "url": "https://www.smb.museum/museen-einrichtungen/neues-museum/besuch-planen/preise-tickets/"
    }
   ],
   "scene": {
    "scene": "gallery",
    "tod": "day"
   }
  },
  {
   "id": "checkin-vy",
   "due": "2026-11-23",
   "dueLabel": "Pzt 23",
   "key": "Vueling check-in",
   "title": "Vueling online check-in (dönüş)",
   "detail": "Vueling uygulamasında; biniş kartını Wallet'a ekle. Basic'te sadece koltuk altı çanta: daha büyük bir şey getirdiysen bagaj ekle.",
   "cost": "Ücretsiz",
   "links": [
    {
     "label": "vueling.com",
     "url": "https://www.vueling.com"
    }
   ]
  }
 ],
 "bookingTips": [
  {
   "title": "Berghain kapısında",
   "icon": "night",
   "items": [
    {
     "icon": "users",
     "text": "Tek ya da en fazla iki kişi; kuyrukta sessiz."
    },
    {
     "icon": "shirt",
     "text": "Siyah ve sade; kostüm, logo, parlak renk yok."
    },
    {
     "icon": "info",
     "text": "O gece kimin çaldığını bil; sorulursa kısa ve dürüst cevap."
    },
    {
     "icon": "alert",
     "text": "Ret açıklanmaz. Tartışma, başka kulübe geç."
    }
   ]
  },
  {
   "title": "Reichstag dolarsa",
   "icon": "landmark",
   "items": [
    {
     "icon": "clock",
     "text": "Servis noktasında sonraki iki gün için yerinde kayıt olabiliyor (pasaportla)."
    },
    {
     "icon": "star",
     "text": "Panoramapunkt (Potsdamer Platz, 24.–25. kat): €9, kışın 10–18."
    },
    {
     "icon": "landmark",
     "text": "Salı TV Kulesi zaten planda: kubbe kaçarsa dert değil."
    }
   ]
  },
  {
   "title": "Kulüp biletleri",
   "icon": "ticket",
   "items": [
    {
     "icon": "speaker",
     "text": "RSO, Tresor ve KitKat biletleri RA'da; QR kod telefonda."
    },
    {
     "icon": "euro",
     "text": "Berghain: ön satış yok, kapıda ödeme."
    },
    {
     "icon": "alert",
     "text": "Biletin olsa bile kapı seni geri çevirebilir: RA'nın iade kurallarını oku."
    }
   ]
  }
 ],
 "packing": [
  "Pasaport + İspanya oturum kartı (TIE): Almanya'da kimlik taşımak zorunlu, kulüpler de sorar",
  "Tek sırt çantası, en fazla 40×30×20 cm (Vueling Basic'in ücretsiz ölçüsü)",
  "Mont, bere, eldiven, atkı: Kasım sonu 0–6°C, kulüp kuyruğunda 30–60 dk dışarıdasın",
  "Kulüp kıyafeti: siyah tişört ya da gömlek, siyah pantolon, rahat siyah ayakkabı",
  "KitKat parçası: mesh üst, harness ya da deri/lateks bir parça",
  "Filtreli kulak tıkacı (müzisyen tipi)",
  "Nakit €100–150 + iki kart (Visa/Mastercard) + telefonda Apple/Google Pay",
  "Fermuarlı küçük çapraz çanta ya da iç cep",
  "Şarj aleti ve en fazla 2 power bank (100 Wh altı; Lufthansa'da uçuşta kullanmak yasak)",
  "Rahat yürüyüş ayakkabısı (günde 15–20 bin adım)",
  "Elektrolit tozu, ağrı kesici, dudak ve el kremi",
  "Sıvılar 100 ml şişelerde, tek şeffaf poşet",
  "Biniş kartları ve Reichstag onayı telefonda (ekran görüntüsü de al)"
 ],
 "openDays": [
  "sat",
  "sun",
  "mon",
  "tue"
 ],
 "places": [
  {
   "id": "sight-east-side-gallery",
   "category": "sight",
   "set": "art",
   "name": "East Side Gallery",
   "text": "Duvarın ayakta kalan en uzun parçası (1,3 km); 1990'dan beri açık hava galerisi.",
   "area": "Friedrichshain",
   "price": "Ücretsiz",
   "booking": "Hayır",
   "open": [
    "o",
    "o",
    "o",
    "o"
   ],
   "openNotes": [
    "7/24",
    "7/24",
    "7/24",
    "7/24"
   ],
   "verdict": "worth",
   "bestTime": "Gün batımı",
   "top": true,
   "scene": "gallery",
   "tod": "golden",
   "place": {
    "name": "East Side Gallery",
    "lat": 52.50445,
    "lng": 13.44084,
    "query": "East Side Gallery, Berlin"
   },
   "searchQuery": "East Side Gallery, Berlin"
  },
  {
   "id": "sight-wall-memorial",
   "category": "sight",
   "set": "sight-other",
   "name": "Berlin Duvarı Anıtı (Bernauer Straße)",
   "text": "Orijinal sınır şeridi, gözetleme kulesi, seyir terası: Duvar'ı en iyi anlatan yer.",
   "area": "Mitte / Wedding",
   "price": "Ücretsiz",
   "booking": "Hayır",
   "open": [
    "o",
    "o",
    "o",
    "o"
   ],
   "openNotes": [
    "Açık hava 8–22, merkez 10–18",
    "Açık hava 8–22, merkez 10–18",
    "Sadece açık hava (merkez kapalı)",
    "Açık hava 8–22, merkez 10–18"
   ],
   "verdict": "worth",
   "bestTime": "Sabah",
   "top": true,
   "scene": "ruins",
   "tod": "day",
   "place": {
    "name": "Berlin Duvarı Anıtı",
    "lat": 52.53582,
    "lng": 13.39085,
    "query": "Gedenkstätte Berliner Mauer, Bernauer Straße 119, Berlin"
   },
   "links": [
    {
     "label": "stiftung-berliner-mauer.de",
     "url": "https://www.stiftung-berliner-mauer.de"
    }
   ],
   "searchQuery": "Gedenkstätte Berliner Mauer, Berlin"
  },
  {
   "id": "sight-reichstag-dome",
   "category": "sight",
   "set": "views",
   "name": "Reichstag kubbesi",
   "text": "Meclis binasının üstündeki cam kubbe ve teras; ücretsiz ama online kayıt şart.",
   "area": "Mitte",
   "price": "Ücretsiz",
   "booking": "Evet (kayıt)",
   "open": [
    "o",
    "o",
    "o",
    "o"
   ],
   "openNotes": [
    "8–24, son giriş 21:45",
    "8–24, son giriş 21:45",
    "8–24, son giriş 21:45",
    "8–24, son giriş 21:45"
   ],
   "verdict": "worth",
   "bestTime": "Gün batımı",
   "top": true,
   "scene": "skyline",
   "tod": "sunset",
   "place": {
    "name": "Reichstag kubbesi",
    "lat": 52.51865,
    "lng": 13.3761,
    "query": "Reichstagsgebäude, Platz der Republik 1, Berlin"
   },
   "links": [
    {
     "label": "Bundestag",
     "url": "https://www.bundestag.de/besuche/kuppel-245686"
    }
   ],
   "searchQuery": "Reichstag dome, Berlin"
  },
  {
   "id": "sight-brandenburg-gate",
   "category": "sight",
   "set": "sight-other",
   "name": "Brandenburger Tor",
   "text": "Bölünmüşlüğün ve 1989'un simgesi.",
   "area": "Mitte",
   "price": "Ücretsiz",
   "booking": "Hayır",
   "open": [
    "o",
    "o",
    "o",
    "o"
   ],
   "verdict": "worth",
   "bestTime": "Mavi saat",
   "top": true,
   "scene": "perspective",
   "tod": "blue",
   "place": {
    "name": "Brandenburger Tor",
    "lat": 52.51627,
    "lng": 13.3777,
    "query": "Brandenburger Tor, Berlin"
   },
   "searchQuery": "Brandenburger Tor, Berlin"
  },
  {
   "id": "sight-holocaust-memorial",
   "category": "sight",
   "set": "sight-other",
   "name": "Avrupa'nın Öldürülen Yahudileri Anıtı",
   "text": "2.711 beton stel; altında bilgi merkezi (Salı–Pazar 10–18).",
   "area": "Mitte",
   "price": "Ücretsiz",
   "booking": "Hayır",
   "open": [
    "o",
    "o",
    "o",
    "o"
   ],
   "openNotes": [
    "Stel alanı 7/24, merkez 10–18",
    "Stel alanı 7/24, merkez 10–18",
    "Stel alanı 7/24, merkez kapalı",
    "Stel alanı 7/24, merkez 10–18"
   ],
   "verdict": "worth",
   "top": true,
   "scene": "perspective",
   "tod": "day",
   "place": {
    "name": "Holokost Anıtı",
    "lat": 52.51387,
    "lng": 13.37873,
    "query": "Denkmal für die ermordeten Juden Europas, Berlin"
   },
   "links": [
    {
     "label": "stiftung-denkmal.de",
     "url": "https://www.stiftung-denkmal.de"
    }
   ],
   "searchQuery": "Holocaust Memorial, Berlin"
  },
  {
   "id": "sight-topographie",
   "category": "sight",
   "set": "sight-other",
   "name": "Topographie des Terrors",
   "text": "Gestapo ve SS merkezinin arsası; ücretsiz sergi ve 200 m Duvar.",
   "area": "Kreuzberg",
   "price": "Ücretsiz",
   "booking": "Hayır",
   "open": [
    "o",
    "o",
    "o",
    "o"
   ],
   "openNotes": [
    "10–20",
    "10–20",
    "10–20",
    "10–20"
   ],
   "verdict": "worth",
   "scene": "ruins",
   "tod": "day",
   "place": {
    "name": "Topographie des Terrors",
    "lat": 52.50621,
    "lng": 13.38415,
    "query": "Topographie des Terrors, Niederkirchnerstraße 8, Berlin"
   },
   "links": [
    {
     "label": "topographie.de",
     "url": "https://www.topographie.de"
    }
   ],
   "searchQuery": "Topographie des Terrors, Berlin"
  },
  {
   "id": "sight-checkpoint-charlie",
   "category": "sight",
   "set": "sight-other",
   "name": "Checkpoint Charlie",
   "text": "Amerikan sınır kapısının kopyası; 5 dakika yeter.",
   "area": "Kreuzberg",
   "price": "Ücretsiz",
   "booking": "Hayır",
   "open": [
    "o",
    "o",
    "o",
    "o"
   ],
   "verdict": "split",
   "scene": "perspective",
   "tod": "day",
   "place": {
    "name": "Checkpoint Charlie",
    "lat": 52.50743,
    "lng": 13.39038,
    "query": "Checkpoint Charlie, Berlin"
   },
   "searchQuery": "Checkpoint Charlie, Berlin"
  },
  {
   "id": "sight-tv-tower",
   "category": "sight",
   "set": "views",
   "name": "TV Kulesi (Fernsehturm)",
   "text": "203 m'de seyir katı: Berlin'in en yüksek manzarası.",
   "area": "Alexanderplatz",
   "price": "€26,50+ online",
   "booking": "Evet",
   "open": [
    "o",
    "o",
    "c",
    "o"
   ],
   "openNotes": [
    "10–23",
    "10–23",
    "Kapalı (özel etkinlik)",
    "10–23"
   ],
   "verdict": "worth",
   "bestTime": "Gün batımı",
   "top": true,
   "scene": "skyline",
   "tod": "sunset",
   "place": {
    "name": "TV Kulesi (Fernsehturm)",
    "lat": 52.52083,
    "lng": 13.40942,
    "query": "Berliner Fernsehturm, Panoramastraße 1A, Berlin"
   },
   "links": [
    {
     "label": "tv-turm.de",
     "url": "https://tv-turm.de/en/"
    }
   ],
   "searchQuery": "Berliner Fernsehturm"
  },
  {
   "id": "sight-panoramapunkt",
   "category": "sight",
   "set": "views",
   "name": "Panoramapunkt",
   "text": "Potsdamer Platz'ta 24.–25. kat; TV Kulesi'nin ucuz alternatifi.",
   "area": "Potsdamer Platz",
   "price": "€9",
   "booking": "Hayır",
   "open": [
    "o",
    "o",
    "o",
    "o"
   ],
   "openNotes": [
    "10–18",
    "10–18",
    "10–18",
    "10–18"
   ],
   "verdict": "worth",
   "bestTime": "Gün batımı",
   "scene": "skyline",
   "tod": "golden",
   "place": {
    "name": "Panoramapunkt",
    "lat": 52.50915,
    "lng": 13.37495,
    "query": "Panoramapunkt, Potsdamer Platz 1, Berlin"
   },
   "searchQuery": "Panoramapunkt, Potsdamer Platz, Berlin"
  },
  {
   "id": "sight-neues-museum",
   "category": "sight",
   "set": "art",
   "name": "Neues Museum (Nefertiti)",
   "text": "Mısır koleksiyonu ve Nefertiti büstü; Chipperfield'in yeniden inşası.",
   "area": "Müze Adası",
   "price": "€14 (Müze Adası günlük €24)",
   "booking": "Önerilir",
   "open": [
    "o",
    "o",
    "c",
    "o"
   ],
   "openNotes": [
    "10–18",
    "10–18",
    "Kapalı",
    "10–18"
   ],
   "verdict": "worth",
   "scene": "gallery",
   "tod": "day",
   "place": {
    "name": "Neues Museum",
    "lat": 52.52016,
    "lng": 13.39774,
    "query": "Neues Museum, Bodestraße 1, Berlin"
   },
   "links": [
    {
     "label": "SMB",
     "url": "https://www.smb.museum/museen-einrichtungen/neues-museum/besuch-planen/preise-tickets/"
    }
   ],
   "searchQuery": "Neues Museum, Berlin"
  },
  {
   "id": "sight-ddr-museum",
   "category": "sight",
   "set": "art",
   "name": "DDR Museum",
   "text": "Doğu Almanya gündelik hayatı, dokunmalı ve etkileşimli.",
   "area": "Mitte",
   "price": "sitesinde",
   "booking": "Hayır",
   "verdict": "split",
   "scene": "gallery",
   "tod": "day",
   "place": {
    "name": "DDR Museum",
    "lat": 52.51944,
    "lng": 13.40224,
    "query": "DDR Museum, Karl-Liebknecht-Straße 1, Berlin"
   },
   "searchQuery": "DDR Museum, Berlin"
  },
  {
   "id": "sight-jewish-museum",
   "category": "sight",
   "set": "art",
   "name": "Yahudi Müzesi (Libeskind binası)",
   "text": "Daniel Libeskind'in zikzak binası; ana sergi ücretsiz. Açık günlerine sitesinden bak.",
   "area": "Kreuzberg",
   "price": "Ana sergi ücretsiz",
   "booking": "Hayır",
   "scene": "gallery",
   "tod": "day",
   "place": {
    "name": "Yahudi Müzesi",
    "lat": 52.50225,
    "lng": 13.39515,
    "query": "Jüdisches Museum Berlin, Lindenstraße 9, Berlin"
   },
   "searchQuery": "Jüdisches Museum Berlin"
  },
  {
   "id": "sight-traenenpalast",
   "category": "sight",
   "set": "sight-other",
   "name": "Tränenpalast",
   "text": "Friedrichstraße'deki “Gözyaşı Sarayı”: Doğu–Batı sınır geçiş salonu, ücretsiz sergi.",
   "area": "Mitte",
   "price": "Ücretsiz",
   "booking": "Hayır",
   "scene": "gallery",
   "tod": "day",
   "place": {
    "name": "Tränenpalast",
    "lat": 52.52086,
    "lng": 13.38709,
    "query": "Tränenpalast, Reichstagufer 17, Berlin"
   },
   "searchQuery": "Tränenpalast, Berlin"
  },
  {
   "id": "sight-raw",
   "category": "sight",
   "set": "sight-other",
   "name": "RAW-Gelände",
   "text": "Eski demiryolu atölyesi: grafiti, kulüpler, kaykay salonu.",
   "area": "Friedrichshain",
   "price": "Ücretsiz",
   "booking": "Hayır",
   "verdict": "worth",
   "scene": "alley",
   "tod": "blue",
   "place": {
    "name": "RAW-Gelände",
    "lat": 52.50602,
    "lng": 13.456,
    "query": "RAW-Gelände, Revaler Straße 99, Berlin"
   },
   "searchQuery": "RAW-Gelände, Berlin"
  },
  {
   "id": "sight-tempelhof",
   "category": "sight",
   "set": "sight-other",
   "name": "Tempelhofer Feld",
   "text": "Hava Köprüsü'nün havalimanı, bugün dev bir park: pistlerde yürü.",
   "area": "Tempelhof",
   "price": "Ücretsiz",
   "booking": "Hayır",
   "bestTime": "Gün batımı",
   "scene": "perspective",
   "tod": "golden",
   "place": {
    "name": "Tempelhofer Feld",
    "lat": 52.47442,
    "lng": 13.4026,
    "query": "Tempelhofer Feld, Berlin"
   },
   "searchQuery": "Tempelhofer Feld, Berlin"
  },
  {
   "id": "sight-berliner-dom",
   "category": "sight",
   "set": "church",
   "name": "Berliner Dom",
   "text": "Müze Adası'ndaki katedral; kubbe galerisi ücretli.",
   "area": "Müze Adası",
   "price": "ücretli (sitesinde)",
   "booking": "Hayır",
   "scene": "church",
   "tod": "day",
   "place": {
    "name": "Berliner Dom",
    "lat": 52.51908,
    "lng": 13.40109,
    "query": "Berliner Dom, Berlin"
   },
   "searchQuery": "Berliner Dom"
  },
  {
   "id": "sight-gedaechtniskirche",
   "category": "sight",
   "set": "church",
   "name": "Kaiser-Wilhelm-Gedächtniskirche",
   "text": "Bombalanmış eski kule ve yanında 1960'ların mavi camlı kilisesi.",
   "area": "Charlottenburg",
   "price": "Ücretsiz",
   "booking": "Hayır",
   "scene": "church",
   "tod": "blue",
   "place": {
    "name": "Kaiser-Wilhelm-Gedächtniskirche",
    "lat": 52.50471,
    "lng": 13.33503,
    "query": "Kaiser-Wilhelm-Gedächtniskirche, Berlin"
   },
   "searchQuery": "Kaiser-Wilhelm-Gedächtniskirche, Berlin"
  },
  {
   "id": "sight-hackesche-hoefe",
   "category": "sight",
   "set": "sight-other",
   "name": "Hackesche Höfe",
   "text": "Birbirine açılan sekiz avlu (1906), Art Nouveau çiniler, küçük dükkânlar.",
   "area": "Mitte",
   "price": "Ücretsiz",
   "booking": "Hayır",
   "scene": "alley",
   "tod": "day",
   "place": {
    "name": "Hackesche Höfe",
    "lat": 52.52427,
    "lng": 13.40172,
    "query": "Hackesche Höfe, Rosenthaler Straße 40, Berlin"
   },
   "searchQuery": "Hackesche Höfe, Berlin"
  },
  {
   "id": "sight-maybachufer-market",
   "category": "sight",
   "set": "sight-other",
   "name": "Maybachufer Türk pazarı",
   "text": "Kanal kıyısında Salı ve Cuma kurulan pazar; Kreuzberg'in Türk hikâyesinin bir parçası.",
   "area": "Kreuzberg / Neukölln",
   "price": "Ücretsiz",
   "booking": "Hayır",
   "scene": "market",
   "tod": "day",
   "place": {
    "name": "Maybachufer Türk pazarı",
    "lat": 52.49262,
    "lng": 13.43069,
    "query": "Türkischer Markt am Maybachufer, Berlin"
   },
   "searchQuery": "Türkischer Markt Maybachufer, Berlin"
  },
  {
   "id": "club-berghain",
   "category": "sight",
   "set": "underground",
   "name": "Berghain / Panorama Bar",
   "text": "Eski termik santral; Cumartesi 23:59'dan Pazartesi sabahına Klubnacht.",
   "area": "Friedrichshain",
   "price": "€25–30 kapıda",
   "booking": "Hayır (kapı)",
   "top": true,
   "scene": "club",
   "tod": "night",
   "place": {
    "name": "Berghain / Panorama Bar",
    "lat": 52.51117,
    "lng": 13.44304,
    "query": "Berghain, Am Wriezener Bahnhof, Berlin"
   },
   "links": [
    {
     "label": "Berghain programı",
     "url": "https://www.berghain.berlin/en/program/"
    }
   ],
   "searchQuery": "Berghain, Berlin"
  },
  {
   "id": "club-tresor",
   "category": "sight",
   "set": "underground",
   "name": "Tresor",
   "text": "1991'de bir banka kasasında açıldı; bugün Kraftwerk'in bodrumunda sert tekno.",
   "area": "Mitte",
   "price": "€10–20",
   "booking": "RA ya da kapı",
   "top": true,
   "scene": "club",
   "tod": "night",
   "place": {
    "name": "Tresor (Kraftwerk)",
    "lat": 52.51068,
    "lng": 13.41948,
    "query": "Tresor, Köpenicker Straße 70, Berlin"
   },
   "links": [
    {
     "label": "tresorberlin.com",
     "url": "https://tresorberlin.com"
    }
   ],
   "searchQuery": "Tresor, Köpenicker Straße 70, Berlin"
  },
  {
   "id": "club-kitkat",
   "category": "sight",
   "set": "underground",
   "name": "KitKatClub",
   "text": "1994'ten beri seks-pozitif kulüp; dress code ve telefon yasağı.",
   "area": "Mitte",
   "price": "€10–25",
   "booking": "RA ya da kapı",
   "scene": "club",
   "tod": "night",
   "place": {
    "name": "KitKatClub",
    "lat": 52.51121,
    "lng": 13.41692,
    "query": "KitKatClub, Köpenicker Straße 76, Berlin"
   },
   "links": [
    {
     "label": "kitkat.club",
     "url": "https://www.kitkat.club"
    }
   ],
   "searchQuery": "KitKatClub, Berlin"
  },
  {
   "id": "club-rso",
   "category": "sight",
   "set": "underground",
   "name": "RSO.Berlin",
   "text": "Schöneweide'de 2021'de açılan dev endüstriyel kulüp, Kirsch ses sistemi.",
   "area": "Schöneweide",
   "price": "€20–30",
   "booking": "RA",
   "scene": "club",
   "tod": "night",
   "place": {
    "name": "RSO.Berlin (Revier Südost)",
    "lat": 52.46,
    "lng": 13.50527,
    "query": "RSO.Berlin, Schnellerstraße 137, Berlin"
   },
   "links": [
    {
     "label": "RA: Berlin etkinlikleri",
     "url": "https://ra.co/events/de/berlin"
    }
   ],
   "searchQuery": "RSO.Berlin, Schnellerstraße 137"
  },
  {
   "id": "club-about-blank",
   "category": "sight",
   "set": "underground",
   "name": "://about blank",
   "text": "Ostkreuz'da kolektif kulüp; uzun hafta sonu partileri, queer geceler, bahçe.",
   "area": "Friedrichshain",
   "price": "€10–20",
   "booking": "Kapı",
   "scene": "club",
   "tod": "night",
   "place": {
    "name": "://about blank",
    "lat": 52.50269,
    "lng": 13.46201,
    "query": "://about blank, Markgrafendamm 24c, Berlin"
   },
   "searchQuery": "about blank, Markgrafendamm 24c, Berlin"
  },
  {
   "id": "club-sisyphos",
   "category": "sight",
   "set": "underground",
   "name": "Sisyphos",
   "text": "Eski fabrikada köy gibi kulüp; hafta sonu boyunca açık.",
   "area": "Rummelsburg",
   "price": "€15–20",
   "booking": "Kapı",
   "scene": "club",
   "tod": "night",
   "place": {
    "name": "Sisyphos",
    "lat": 52.49333,
    "lng": 13.4919,
    "query": "Sisyphos, Hauptstraße 15, Berlin"
   },
   "searchQuery": "Sisyphos, Hauptstraße 15, Berlin"
  },
  {
   "id": "club-kater-blau",
   "category": "sight",
   "set": "underground",
   "name": "Kater Blau",
   "text": "Spree kıyısında, daha house ve gündüz partileri.",
   "area": "Friedrichshain",
   "price": "€10–20",
   "booking": "Kapı",
   "scene": "club",
   "tod": "night",
   "place": {
    "name": "Kater Blau",
    "lat": 52.5119,
    "lng": 13.42536,
    "query": "Kater Blau, Holzmarktstraße 25, Berlin"
   },
   "searchQuery": "Kater Blau, Berlin"
  },
  {
   "id": "shop-hard-wax",
   "category": "sight",
   "set": "sight-other",
   "name": "Hard Wax",
   "text": "Berlin tekno plakçısı (1989); Kraftwerk binasında, Tresor'un yanında.",
   "area": "Mitte",
   "price": "plak ~€12–20",
   "booking": "Hayır",
   "open": [
    "o",
    "c",
    "o",
    "o"
   ],
   "openNotes": [
    "15–20",
    "Kapalı",
    "15–20",
    "15–20"
   ],
   "top": true,
   "scene": "gallery",
   "tod": "day",
   "place": {
    "name": "Hard Wax @ Kraftwerk",
    "lat": 52.51068,
    "lng": 13.41948,
    "query": "Tresor, Köpenicker Straße 70, Berlin"
   },
   "searchQuery": "Hard Wax, Köpenicker Straße 70, Berlin"
  },
  {
   "id": "shop-spacehall",
   "category": "sight",
   "set": "sight-other",
   "name": "Spacehall",
   "text": "Kreuzberg'de büyük elektronik plak dükkânı.",
   "area": "Kreuzberg",
   "price": "plak",
   "booking": "Hayır",
   "open": [
    "o",
    "c",
    "o",
    "o"
   ],
   "scene": "gallery",
   "tod": "day",
   "place": {
    "name": "Spacehall",
    "lat": 52.49073,
    "lng": 13.39445,
    "query": "Spacehall, Zossener Straße 35, Berlin"
   },
   "searchQuery": "Spacehall, Zossener Straße 35, Berlin"
  },
  {
   "id": "shop-voo",
   "category": "sight",
   "set": "sight-other",
   "name": "Voo Store",
   "text": "Avlunun içinde konsept mağaza; içinde Companion Coffee.",
   "area": "Kreuzberg",
   "price": "alışveriş",
   "booking": "Hayır",
   "open": [
    "o",
    "c",
    "o",
    "o"
   ],
   "scene": "alley",
   "tod": "day",
   "place": {
    "name": "Voo Store",
    "lat": 52.50117,
    "lng": 13.42112,
    "query": "Voo Store, Oranienstraße 24, Berlin"
   },
   "searchQuery": "Voo Store, Oranienstraße 24, Berlin"
  },
  {
   "id": "shop-ampelmann",
   "category": "sight",
   "set": "sight-other",
   "name": "Ampelmann (Hackesche Höfe)",
   "text": "Doğu Berlin'in trafik ışığı adamı: en klasik hediyelik.",
   "area": "Mitte",
   "price": "€5–30",
   "booking": "Hayır",
   "open": [
    "o",
    "c",
    "o",
    "o"
   ],
   "scene": "alley",
   "tod": "day",
   "place": {
    "name": "Ampelmann (Hackesche Höfe)",
    "lat": 52.524,
    "lng": 13.4025,
    "query": "Ampelmann Shop, Hackesche Höfe, Berlin"
   },
   "searchQuery": "Ampelmann Shop Hackesche Höfe, Berlin"
  },
  {
   "id": "shop-kadewe",
   "category": "sight",
   "set": "sight-other",
   "name": "KaDeWe",
   "text": "1907'den beri büyük mağaza; 6. kat gurme katı.",
   "area": "Schöneberg",
   "price": "alışveriş",
   "booking": "Hayır",
   "open": [
    "o",
    "c",
    "o",
    "o"
   ],
   "scene": "skyline",
   "tod": "day",
   "place": {
    "name": "KaDeWe",
    "lat": 52.50158,
    "lng": 13.341,
    "query": "KaDeWe, Tauentzienstraße 21, Berlin"
   },
   "searchQuery": "KaDeWe, Berlin"
  },
  {
   "id": "xmas-gendarmenmarkt",
   "category": "sight",
   "set": "views",
   "name": "Gendarmenmarkt Noel pazarı",
   "text": "WeihnachtsZauber: Berlin'in en şık pazarı, iki katedralin arasında.",
   "area": "Mitte",
   "price": "€2 (Pzt–Cum 11–14 ücretsiz)",
   "booking": "Hayır",
   "open": [
    "c",
    "c",
    "o",
    "o"
   ],
   "openNotes": [
    "Henüz yok",
    "Henüz yok",
    "Açılış günü",
    "Açık"
   ],
   "verdict": "worth",
   "bestTime": "Akşam",
   "top": true,
   "scene": "market",
   "tod": "blue",
   "place": {
    "name": "Gendarmenmarkt",
    "lat": 52.51357,
    "lng": 13.3923,
    "query": "Weihnachtsmarkt Gendarmenmarkt, Berlin"
   },
   "searchQuery": "Weihnachtsmarkt Gendarmenmarkt, Berlin"
  },
  {
   "id": "xmas-rotes-rathaus",
   "category": "sight",
   "set": "views",
   "name": "Rotes Rathaus Noel pazarı",
   "text": "TV Kulesi'nin dibinde: dönme dolap, buz pisti, ücretsiz.",
   "area": "Mitte",
   "price": "Ücretsiz",
   "booking": "Hayır",
   "open": [
    "c",
    "c",
    "o",
    "o"
   ],
   "openNotes": [
    "Henüz yok",
    "Henüz yok",
    "Açılış günü",
    "Açık"
   ],
   "verdict": "worth",
   "bestTime": "Akşam",
   "scene": "market",
   "tod": "night",
   "place": {
    "name": "Rotes Rathaus Noel pazarı",
    "lat": 52.51827,
    "lng": 13.40783,
    "query": "Weihnachtsmarkt Rotes Rathaus, Berlin"
   },
   "searchQuery": "Weihnachtsmarkt Rotes Rathaus, Berlin"
  },
  {
   "id": "xmas-charlottenburg",
   "category": "sight",
   "set": "views",
   "name": "Schloss Charlottenburg Noel pazarı",
   "text": "Saray önünde, en masalsı pazar; 23 Kas – 27 Ara.",
   "area": "Charlottenburg",
   "price": "sitesine bak",
   "booking": "Hayır",
   "open": [
    "c",
    "c",
    "o",
    "o"
   ],
   "scene": "market",
   "tod": "night",
   "place": {
    "name": "Schloss Charlottenburg Noel pazarı",
    "lat": 52.52064,
    "lng": 13.29271,
    "query": "Weihnachtsmarkt Schloss Charlottenburg, Berlin"
   },
   "searchQuery": "Weihnachtsmarkt Schloss Charlottenburg, Berlin"
  },
  {
   "id": "xmas-kulturbrauerei",
   "category": "sight",
   "set": "views",
   "name": "Lucia Noel pazarı (Kulturbrauerei)",
   "text": "Eski bira fabrikasının tuğla avlularında İskandinav temalı pazar.",
   "area": "Prenzlauer Berg",
   "price": "sitesine bak",
   "booking": "Hayır",
   "open": [
    "c",
    "c",
    "o",
    "o"
   ],
   "scene": "market",
   "tod": "night",
   "place": {
    "name": "Lucia Noel pazarı, Kulturbrauerei",
    "lat": 52.53927,
    "lng": 13.41398,
    "query": "Kulturbrauerei, Schönhauser Allee 36, Berlin"
   },
   "searchQuery": "Lucia Weihnachtsmarkt Kulturbrauerei, Berlin"
  },
  {
   "id": "food-konnopke",
   "category": "food",
   "set": "street",
   "name": "Konnopke's Imbiß",
   "text": "1930'dan beri U2 raylarının altında currywurst.",
   "area": "Prenzlauer Berg",
   "price": "€5–8",
   "booking": "Hayır",
   "scene": "panino",
   "tod": "day",
   "place": {
    "name": "Konnopke's Imbiß",
    "lat": 52.54047,
    "lng": 13.41222,
    "query": "Konnopke's Imbiß, Schönhauser Allee 44b, Berlin"
   },
   "searchQuery": "Konnopke's Imbiß, Berlin"
  },
  {
   "id": "food-curry36",
   "category": "food",
   "set": "street",
   "name": "Curry 36",
   "text": "Mehringdamm'da klasik currywurst büfesi.",
   "area": "Kreuzberg",
   "price": "€5–8",
   "booking": "Hayır",
   "scene": "panino",
   "tod": "day",
   "place": {
    "name": "Curry 36",
    "lat": 52.49349,
    "lng": 13.38769,
    "query": "Curry 36, Mehringdamm 36, Berlin"
   },
   "searchQuery": "Curry 36, Mehringdamm 36, Berlin"
  },
  {
   "id": "food-mustafa",
   "category": "food",
   "set": "street",
   "name": "Mustafa's Gemüse Kebap",
   "text": "Kızarmış sebzeli, peynirli döner; Berlin'in en ünlü kuyruğu.",
   "area": "Kreuzberg",
   "price": "€7–10",
   "booking": "Hayır",
   "verdict": "split",
   "scene": "panino",
   "tod": "day",
   "place": {
    "name": "Mustafa's Gemüse Kebap",
    "lat": 52.49396,
    "lng": 13.38739,
    "query": "Mustafa's Gemüse Kebap, Mehringdamm 32, Berlin"
   },
   "searchQuery": "Mustafa's Gemüse Kebap, Berlin"
  },
  {
   "id": "food-hasir",
   "category": "food",
   "set": "street",
   "name": "Hasir Kreuzberg",
   "text": "Kottbusser Tor'da, döneri icat ettiğini söyleyen ailenin restoranı.",
   "area": "Kreuzberg",
   "price": "€8–15",
   "booking": "Hayır",
   "scene": "panino",
   "tod": "day",
   "place": {
    "name": "Hasir Kreuzberg",
    "lat": 52.50079,
    "lng": 13.41947,
    "query": "Hasir Kreuzberg, Adalbertstraße 10, Berlin"
   },
   "searchQuery": "Hasir Kreuzberg, Adalbertstraße 10, Berlin"
  },
  {
   "id": "food-burgermeister",
   "category": "food",
   "set": "street",
   "name": "Burgermeister (Oberbaum)",
   "text": "U1 raylarının altında eski bir tuvalet pavyonunda burger.",
   "area": "Kreuzberg",
   "price": "€10–15",
   "booking": "Hayır",
   "scene": "panino",
   "tod": "day",
   "place": {
    "name": "Burgermeister",
    "lat": 52.50112,
    "lng": 13.44246,
    "query": "Burgermeister, Oberbaumstraße 8, Berlin"
   },
   "searchQuery": "Burgermeister, Oberbaumstraße 8, Berlin"
  },
  {
   "id": "food-rausch",
   "category": "food",
   "set": "sweet",
   "name": "Rausch Schokoladenhaus",
   "text": "Çikolatadan Brandenburger Tor ve Reichstag; üst katta kafe.",
   "area": "Mitte",
   "price": "€5–20",
   "booking": "Hayır",
   "scene": "espresso",
   "tod": "day",
   "place": {
    "name": "Rausch Schokoladenhaus",
    "lat": 52.51208,
    "lng": 13.39135,
    "query": "Rausch Schokoladenhaus, Charlottenstraße 60, Berlin"
   },
   "searchQuery": "Rausch Schokoladenhaus, Berlin"
  },
  {
   "id": "food-silo",
   "category": "food",
   "set": "sweet",
   "name": "Silo Coffee",
   "text": "Friedrichshain'da kahve ve brunch.",
   "area": "Friedrichshain",
   "price": "€15–20",
   "booking": "Hayır",
   "scene": "espresso",
   "tod": "day",
   "place": {
    "name": "Silo Coffee",
    "lat": 52.51014,
    "lng": 13.45837,
    "query": "Silo Coffee, Gabriel-Max-Straße 4, Berlin"
   },
   "searchQuery": "Silo Coffee, Gabriel-Max-Straße 4, Berlin"
  },
  {
   "id": "food-spaetzle",
   "category": "food",
   "set": "food-other",
   "name": "Spätzle & Knödel",
   "text": "Käsespätzle ve knödel: Güney Almanya'nın kış yemekleri.",
   "area": "Friedrichshain",
   "price": "€15–20",
   "booking": "Hayır",
   "scene": "lasagna",
   "tod": "night",
   "place": {
    "name": "Spätzle & Knödel",
    "lat": 52.50882,
    "lng": 13.46125,
    "query": "Spätzle & Knödel, Wühlischstraße 20, Berlin"
   },
   "searchQuery": "Spätzle & Knödel, Wühlischstraße 20, Berlin"
  },
  {
   "id": "food-markthalle-neun",
   "category": "food",
   "set": "food-other",
   "name": "Markthalle Neun",
   "text": "Kreuzberg'de tarihi pazar holü; Perşembe akşamları Street Food Thursday.",
   "area": "Kreuzberg",
   "price": "€10–20",
   "booking": "Hayır",
   "scene": "market",
   "tod": "day",
   "place": {
    "name": "Markthalle Neun",
    "lat": 52.50217,
    "lng": 13.43149,
    "query": "Markthalle Neun, Eisenbahnstraße 42, Berlin"
   },
   "searchQuery": "Markthalle Neun, Berlin"
  },
  {
   "id": "food-letzte-instanz",
   "category": "food",
   "set": "food-other",
   "name": "Zur letzten Instanz",
   "text": "1621'den beri, Berlin'in en eski restoranı: Eisbein ve Alman klasikleri.",
   "area": "Mitte",
   "price": "€20–30",
   "booking": "Önerilir",
   "scene": "lasagna",
   "tod": "night",
   "place": {
    "name": "Zur letzten Instanz",
    "lat": 52.51735,
    "lng": 13.41376,
    "query": "Zur letzten Instanz, Waisenstraße 14, Berlin"
   },
   "searchQuery": "Zur letzten Instanz, Berlin"
  },
  {
   "id": "food-vuong",
   "category": "food",
   "set": "food-other",
   "name": "Monsieur Vuong",
   "text": "Mitte'de Vietnam mutfağı; Berlin'in Vietnam mirası.",
   "area": "Mitte",
   "price": "€12–18",
   "booking": "Hayır",
   "scene": "market",
   "tod": "night",
   "place": {
    "name": "Monsieur Vuong",
    "lat": 52.52664,
    "lng": 13.40795,
    "query": "Monsieur Vuong, Alte Schönhauser Straße 46, Berlin"
   },
   "searchQuery": "Monsieur Vuong, Berlin"
  },
  {
   "id": "photo-oberbaum",
   "category": "photo",
   "set": "golden",
   "name": "Oberbaumbrücke ve sarı U1",
   "text": "Tuğla kuleler, üst kattan geçen U1; en iyisi akşamüstü.",
   "area": "Friedrichshain / Kreuzberg",
   "scene": "perspective",
   "tod": "golden",
   "place": {
    "name": "Oberbaumbrücke",
    "lat": 52.50173,
    "lng": 13.44573,
    "query": "Oberbaumbrücke, Berlin"
   },
   "searchQuery": "Oberbaumbrücke, Berlin"
  },
  {
   "id": "photo-molecule-man",
   "category": "photo",
   "set": "golden",
   "name": "Molecule Man",
   "text": "Spree'nin ortasında 30 m'lik alüminyum heykel; Oberbaum'dan nehir boyunca görünür.",
   "area": "Treptow",
   "scene": "lake",
   "tod": "golden",
   "place": {
    "name": "Molecule Man",
    "lat": 52.49698,
    "lng": 13.45895,
    "query": "Molecule Man, Berlin"
   },
   "searchQuery": "Molecule Man, Berlin"
  },
  {
   "id": "photo-holocaust-stelae",
   "category": "photo",
   "set": "morning",
   "name": "Stellerin arası",
   "text": "Sabah boş; gri bloklar arasında ışık ve gölge. Saygılı ol.",
   "area": "Mitte",
   "scene": "perspective",
   "tod": "day",
   "place": {
    "name": "Holokost Anıtı",
    "lat": 52.51387,
    "lng": 13.37873,
    "query": "Denkmal für die ermordeten Juden Europas, Berlin"
   },
   "searchQuery": "Holocaust Memorial, Berlin"
  },
  {
   "id": "photo-reichstag-ramp",
   "category": "photo",
   "set": "golden",
   "name": "Reichstag kubbesinin rampası",
   "text": "Aynalı koni ve sarmal rampa, gün batımında.",
   "area": "Mitte",
   "scene": "skyline",
   "tod": "sunset",
   "place": {
    "name": "Reichstag kubbesi",
    "lat": 52.51865,
    "lng": 13.3761,
    "query": "Reichstagsgebäude, Platz der Republik 1, Berlin"
   },
   "searchQuery": "Reichstag dome, Berlin"
  },
  {
   "id": "photo-dom-spree",
   "category": "photo",
   "set": "golden",
   "name": "Berliner Dom ve Spree",
   "text": "Lustgarten'dan Dom, arkada TV Kulesi; mavi saatte en güzeli.",
   "area": "Müze Adası",
   "scene": "church",
   "tod": "blue",
   "place": {
    "name": "Lustgarten",
    "lat": 52.51854,
    "lng": 13.3994,
    "query": "Lustgarten, Berlin"
   },
   "searchQuery": "Lustgarten, Berlin"
  },
  {
   "id": "photo-gendarmenmarkt-lights",
   "category": "photo",
   "set": "anytime",
   "name": "Gendarmenmarkt ışıkları",
   "text": "Katedraller ve Noel pazarı ışıkları, karanlık çökünce.",
   "area": "Mitte",
   "scene": "market",
   "tod": "blue",
   "place": {
    "name": "Gendarmenmarkt",
    "lat": 52.51357,
    "lng": 13.3923,
    "query": "Weihnachtsmarkt Gendarmenmarkt, Berlin"
   },
   "searchQuery": "Gendarmenmarkt, Berlin"
  }
 ],
 "dishes": [
  {
   "name": "Currywurst",
   "sub": "Kızarmış sosis + köri ketçap, patatesle",
   "pork": "Çoğunlukla domuz; “Rindswurst” (dana) ya da vegan iste",
   "where": "Konnopke's Imbiß, Curry 36, Noel pazarları",
   "scene": "panino"
  },
  {
   "name": "Döner (Berlin usulü)",
   "sub": "Bol salata ve üç sos: sarımsaklı, otlu, acı",
   "pork": "Domuz yok: dana, tavuk ya da kuzu",
   "where": "Hasir (Kotti), Mustafa's (sebzeli), Kreuzberg'in her köşesi",
   "scene": "panino"
  },
  {
   "name": "Berliner Pfannkuchen",
   "sub": "Reçelli kızarmış hamur; Berlin'de buna “Berliner” denmez",
   "pork": "Domuz yok",
   "where": "Her fırın (Bäckerei), Noel pazarları",
   "scene": "espresso"
  },
  {
   "name": "Käsespätzle",
   "sub": "Peynirli yumurtalı erişte, kızarmış soğanla",
   "pork": "Domuz yok (bazen üstünde Speck: sor)",
   "where": "Spätzle & Knödel (Friedrichshain), Noel pazarları",
   "scene": "lasagna"
  },
  {
   "name": "Reibekuchen / Kartoffelpuffer",
   "sub": "Patates köftesi, elma püresiyle",
   "pork": "Domuz yok",
   "where": "Noel pazarları",
   "scene": "market"
  },
  {
   "name": "Bratwurst / Thüringer",
   "sub": "Izgara sosis, ekmek arası hardalla",
   "pork": "Çoğunlukla domuz",
   "where": "Noel pazarları, büfeler",
   "scene": "panino"
  },
  {
   "name": "Eisbein",
   "sub": "Haşlanmış domuz incik, lahana turşusu ve bezelye püresiyle",
   "pork": "Domuz",
   "where": "Zur letzten Instanz",
   "scene": "lasagna"
  },
  {
   "name": "Glühwein",
   "sub": "Baharatlı sıcak şarap; alkolsüzü Kinderpunsch",
   "pork": "Domuz yok",
   "where": "Noel pazarları (bardak depozitolu)",
   "scene": "spritz"
  },
  {
   "name": "Club-Mate",
   "sub": "Kafeinli maté gazozu: Berlinli raver'ların içeceği",
   "pork": "Domuz yok",
   "where": "Her Späti ve kulüp barı",
   "scene": "spritz"
  },
  {
   "name": "Phở ve Vietnam mutfağı",
   "sub": "Doğu Berlin'in Vietnam topluluğundan miras",
   "pork": "Çoğu dana ya da tavuk; menüye bak",
   "where": "Monsieur Vuong (Mitte), Friedrichshain'da her sokak",
   "scene": "market"
  }
 ],
 "info": [
  {
   "id": "rave",
   "title": "Rave rehberi",
   "subtitle": "Berlin tekno kültürü, kulüpler, kapılar, kurallar",
   "icon": "speaker",
   "blocks": [
    {
     "t": "p",
     "text": "Berlin'de tekno bir müzik türünden fazlası: Duvar yıkılınca Doğu Berlin'de sahipsiz kalan santraller, bodrumlar ve banka kasaları ilk kulüplere dönüştü. 2024'te “Berlin'in tekno kültürü” Almanya'nın somut olmayan kültürel miras listesine girdi."
    },
    {
     "t": "p",
     "text": "### Kısa tarih"
    },
    {
     "t": "list",
     "items": [
      "**1989–1990:** Duvar yıkılır; Doğu'da kimsenin sahip çıkmadığı binalar, yasal boşluk ve ucuz kira. Partiler fabrikalarda ve bodrumlarda başlar.",
      "**1991, Tresor:** eski Wertheim mağazasının banka kasasında açılır; Detroit'ten Underground Resistance, Jeff Mills, Juan Atkins gelir. “Berlin–Detroit ekseni” doğar.",
      "**1989–2006, Love Parade:** Kurfürstendamm'da bir avuç insanla başlar, Tiergarten'da yüz binlere ulaşır.",
      "**2004, Berghain:** eski bir termik santralde açılır (öncesi Ostgut). Kapısı, fotoğraf yasağı ve 30 saati aşan Klubnacht'larıyla dünyanın en bilinen kulübü olur.",
      "**Bugün:** Watergate 2024 sonunda kapandı; yeni kuşak RSO gibi şehrin kenarındaki dev endüstri yapılarında. Hızlı, sert, endüstriyel tekno yeniden yükselişte."
     ]
    },
    {
     "t": "special",
     "kind": "nightChart"
    },
    {
     "t": "p",
     "text": "### Bu gezide senin gecelerin"
    },
    {
     "t": "table",
     "head": [
      "Gece",
      "Kulüp",
      "Ne çalar",
      "Fiyat",
      "Saat"
     ],
     "rows": [
      [
       "Cmt 21",
       "**RSO.Berlin** · Schnellerstraße 137, Schöneweide (S9)",
       "sert, endüstriyel tekno",
       "€20–30 (RA)",
       "23:59 → ~04:00 (Totensonntag)"
      ],
      [
       "Paz 22",
       "**Berghain / Panorama Bar** · Am Wriezener Bahnhof",
       "tekno (alt kat), house (üst kat)",
       "€25–30, kapıda",
       "21:00 sonrası (programa bak)"
      ],
      [
       "Pzt 23",
       "**KitKatClub, Electric Monday** · Köpenicker Str. 76",
       "tekno, house",
       "€10–20",
       "22:00 → sabah"
      ],
      [
       "Pzt 23",
       "**Tresor, Singularity** · Köpenicker Str. 70",
       "sert tekno",
       "€10–20",
       "23:00 → sabah"
      ]
     ]
    },
    {
     "t": "callout",
     "title": "Totensonntag: Pazar 22 Kasım",
     "text": "Berlin'in “sessiz bayram”larından biri: Pazar 04:00–21:00 arası dans etkinlikleri yasak. Kulüpler Cumartesi gecesini genelde 04:00'te bitirir, Pazar akşamı yeniden açar. Saatleri Cuma 20 Kasım'da kulüplerin kendi programından ve RA'dan teyit et.",
     "tone": "gold"
    },
    {
     "t": "p",
     "text": "### Berghain'e girmek"
    },
    {
     "t": "list",
     "items": [
      "Ön satış ve misafir listesi yok: herkes kuyruğa girer, ödeme kapıda.",
      "Kapı kuralını açıklamaz. Genel gözlem: kalabalık grup, sarhoşluk, turist tavrı ve elde kamera çoğunlukla ret demek.",
      "Siyah ve sade giy, rahat ayakkabı. Kuyrukta sessiz dur, fotoğraf çekme.",
      "O gece kimin çaldığını bil. Sorulursa kısa ve dürüst cevap ver.",
      "Ret olursan tartışma, başka kulübe geç: Berlin'de bu normal.",
      "İçeride: kameraya sticker, fotoğraf ve video yasak. Yetişkin kulübü: karanlık odalar var, rıza kuralı geçerli."
     ]
    },
    {
     "t": "p",
     "text": "### Tresor ve Kraftwerk"
    },
    {
     "t": "p",
     "text": "Tresor 2007'den beri eski Heizkraftwerk Mitte'nin, yani Kraftwerk binasının içinde: ana salon bodrumda, orijinal kasa kapılarıyla; üstte Globus. Aynı binada OHM kulübü ve Hard Wax plakçısı var. Pazartesi “Singularity” geceleri tekno sevenler için hafta içinin en iyi seçeneklerinden."
    },
    {
     "t": "p",
     "text": "### KitKatClub"
    },
    {
     "t": "list",
     "items": [
      "1994'ten beri seks-pozitif kulüp; bugün Köpenicker Str. 76'da (eski Sage Club binası), havuzlu ana salonuyla.",
      "Çoğu gece dress code fetiş ya da yaratıcı: lateks, deri, harness, kostüm. Pazartesi Electric Monday'de daha rahat: siyah üst, mesh, kinky sportswear.",
      "Telefon yasağı katı; Electric Monday'de telefonu hiç çıkarma.",
      "Rıza kuralı: dokunmadan önce sor; “hayır” ya da sessizlik hayır demek. Rahatsız olursan awareness ekibine ya da personele söyle.",
      "Seks-pozitif zorunlu demek değil: çoğu kişi sadece dans eder."
     ]
    },
    {
     "t": "p",
     "text": "### Fetiş ve queer geceler"
    },
    {
     "t": "p",
     "text": "Senin tarihlerine denk gelen: KitKat'ın Electric Monday'i. Berlin'in diğer bilinen queer ve fetiş serileri (KitKat'ta GEGEN, about blank'te queer partiler, Berghain'in altındaki Lab.oratory) belirli tarihlerde olur; RA'da “queer” ya da “fetish” diye ara. Bu gecelerde kapıda dress code ve rıza kuralları daha sıkı."
    },
    {
     "t": "p",
     "text": "### Sert tekno için başka adresler"
    },
    {
     "t": "table",
     "head": [
      "Kulüp",
      "Nerede",
      "Not"
     ],
     "rows": [
      [
       "**://about blank**",
       "Ostkreuz",
       "kolektif kulüp, uzun hafta sonu partileri, queer geceler"
      ],
      [
       "**Sisyphos**",
       "Rummelsburg",
       "eski fabrika, hafta sonu boyunca açık, köy gibi"
      ],
      [
       "**OHM**",
       "Kraftwerk, Tresor'un yanı",
       "küçük, deneysel ve sert setler"
      ],
      [
       "**Kater Blau**",
       "Holzmarkt, Spree kıyısı",
       "daha house, gündüz de açık"
      ],
      [
       "**Golden Gate**",
       "Jannowitzbrücke",
       "küçük, ham, uzun geceler"
      ]
     ]
    },
    {
     "t": "p",
     "text": "### Görgü kuralları"
    },
    {
     "t": "list",
     "items": [
      "Fotoğraf ve video yok: kameraya yapıştırılan sticker'ı sökme.",
      "Dans pistinde telefon ekranı açmak bile hoş karşılanmaz.",
      "Vestiyer €2–3; değerli eşyaları üzerinde taşı.",
      "DJ'e istek yapılmaz; sohbet bar tarafında.",
      "Şişe ve bardaklar depozitolu (Pfand): bara iade et.",
      "Kimse seni izlemiyor, rahat ol: Berlin'de herkes kendi halinde."
     ]
    },
    {
     "t": "p",
     "text": "### Sağlık ve güvenlik"
    },
    {
     "t": "list",
     "items": [
      "**Su iç, mola ver.** Uzun gecelerde susuzluk ve sıcak en sık sorun.",
      "**Kulak tıkacı tak:** bu ses sistemleri saatlerce çok yüksek.",
      "**Alkol ile GHB/GBL birlikte** kulüplerdeki bayılmaların başlıca nedeni ve ölümcül olabilir. Yabancıdan içki ya da şişe alma, bardağını gözden kaçırma.",
      "**Biri bilinçsizse:** yan yatır, yalnız bırakma, personele ya da awareness ekibine haber ver, 112'yi ara.",
      "**Drug checking:** Berlin'de ücretsiz ve anonim madde analizi var (Vista, Fixpunkt, Schwulenberatung) ama sonuç yaklaşık 3 gün sürüyor; kısa bir ziyarette işe yaramaz.",
      "**Zehir danışma hattı (7/24):** 030 19240."
     ]
    },
    {
     "t": "callout",
     "title": "Yasal durum",
     "text": "Almanya'da 2024'ten beri yetişkinler 25 g'a kadar esrar taşıyabiliyor ama satın almanın yasal yolu yalnızca Almanya'da yaşayanlara açık; turist için yasal satış yok. Diğer tüm uyuşturucular yasa dışı. Kulüp kapısında arama, çevrede sivil polis olur. Oturum izniyle yaşayan biri olarak risk alma.",
     "tone": "accent"
    },
    {
     "t": "p",
     "text": "### Eve dönüş"
    },
    {
     "t": "list",
     "items": [
      "Cuma ve Cumartesi geceleri S-Bahn ve U-Bahn bütün gece çalışır.",
      "Hafta içi (Pazartesi gecesi): U-Bahn ~01:00'de durur, ~04:30'da başlar; arada gece otobüsleri (N hatları) ya da Bolt, Uber, FreeNow.",
      "Berghain'den eve yürüme 15 dk.",
      "Telefonu %30'un altına düşürme: harita da bilet de orada."
     ]
    }
   ]
  },
  {
   "id": "wall",
   "title": "Duvar ve Soğuk Savaş",
   "subtitle": "Ne oldu, neyi nerede göreceksin",
   "icon": "landmark",
   "blocks": [
    {
     "t": "p",
     "text": "Berlin'i anlamanın anahtarı 1961–1989: Batı Berlin 28 yıl boyunca yaklaşık 155 km'lik bir duvarla çevrili bir adaydı, Doğu Berlin ise DDR'in başkenti."
    },
    {
     "t": "table",
     "head": [
      "Yıl",
      "Ne oldu"
     ],
     "rows": [
      [
       "1945",
       "Nazi Almanyası yenilir; Berlin dört bölgeye ayrılır (ABD, İngiltere, Fransa, SSCB)."
      ],
      [
       "1948–49",
       "Sovyet ablukası; Batı şehri aylarca havadan besler (Hava Köprüsü, Tempelhof)."
      ],
      [
       "13 Ağu 1961",
       "DDR bir gecede dikenli tel çeker, ardından beton duvar."
      ],
      [
       "1963",
       "Kennedy, Schöneberg Belediyesi önünde: “Ich bin ein Berliner”."
      ],
      [
       "1961–1989",
       "Duvarda en az 140 kişi öldü."
      ],
      [
       "9 Kas 1989",
       "Karışık bir basın toplantısının ardından sınır kapıları açılır."
      ],
      [
       "3 Eki 1990",
       "Almanya yeniden birleşir."
      ],
      [
       "1999",
       "Federal Meclis yenilenen Reichstag binasına taşınır."
      ]
     ]
    },
    {
     "t": "table",
     "head": [
      "Yer",
      "Ne göreceksin",
      "Gün"
     ],
     "rows": [
      [
       "East Side Gallery",
       "1,3 km boyanmış Duvar",
       "Cmt"
      ],
      [
       "Topographie des Terrors",
       "Nazi terörünün merkezi + Duvar parçası",
       "Paz"
      ],
      [
       "Checkpoint Charlie",
       "Amerikan sınır kapısı (kopya)",
       "Paz"
      ],
      [
       "Brandenburger Tor ve Reichstag",
       "1989'un ve birleşmenin sahnesi",
       "Paz"
      ],
      [
       "Bernauer Straße",
       "Gerçek ölüm şeridi, kule, kaçış tünelleri",
       "Sal"
      ],
      [
       "Tränenpalast",
       "Friedrichstraße'deki sınır geçiş salonu, ücretsiz",
       "istersen"
      ]
     ]
    },
    {
     "t": "p",
     "text": "### Türk Berlin'i"
    },
    {
     "t": "p",
     "text": "1961'de Türkiye ile imzalanan işgücü anlaşmasıyla gelenler Kreuzberg'i “Küçük İstanbul”a çevirdi; Duvar'ın dibindeki ucuz evler onlara kaldı. Kottbusser Tor, Oranienstraße ve kanal kıyısındaki Maybachufer pazarı (Salı ve Cuma) bu hikâyenin parçası. Ekmek arası döner de 1970'lerin Berlin'inde doğdu."
    }
   ]
  },
  {
   "id": "museums",
   "title": "Müzeler ve sanat",
   "subtitle": "Pazartesi çoğu kapalı",
   "icon": "star",
   "blocks": [
    {
     "t": "table",
     "head": [
      "Müze",
      "Ne var",
      "Fiyat",
      "Açık"
     ],
     "rows": [
      [
       "Neues Museum",
       "Nefertiti, Mısır",
       "€14 (Müze Adası günlük €24)",
       "Salı–Pazar 10–18"
      ],
      [
       "Topographie des Terrors",
       "Nazi terörü",
       "Ücretsiz",
       "Her gün 10–20"
      ],
      [
       "Duvar Anıtı merkezi",
       "Duvar'ın tarihi + seyir terası",
       "Ücretsiz",
       "Salı–Pazar 10–18"
      ],
      [
       "Holokost Anıtı bilgi merkezi",
       "Kurbanların hikâyeleri",
       "Ücretsiz",
       "Salı–Pazar 10–18"
      ],
      [
       "Yahudi Müzesi",
       "Libeskind binası",
       "Ana sergi ücretsiz",
       "sitesine bak"
      ],
      [
       "DDR Museum",
       "Doğu Almanya gündelik hayatı",
       "sitesinde",
       "her gün"
      ]
     ]
    },
    {
     "t": "p",
     "text": "Müze Adası'nda birden çok müze gezeceksen günlük “Museumsinsel” bileti €24; 3 günlük Berlin Museumspass €32 (kalıcı sergiler). Bu planda tek müze var, tek bilet yeterli."
    },
    {
     "t": "p",
     "text": "### Çağdaş sanat"
    },
    {
     "t": "list",
     "items": [
      "**Hamburger Bahnhof:** eski bir tren istasyonunda çağdaş sanat.",
      "**Sammlung Boros:** bir savaş sığınağında özel koleksiyon; rehberli turları haftalar önceden doluyor.",
      "**East Side Gallery** zaten açık hava galerisi."
     ]
    }
   ]
  },
  {
   "id": "xmas",
   "title": "Noel pazarları",
   "subtitle": "Pazartesi 23 Kasım açılıyor",
   "icon": "star",
   "blocks": [
    {
     "t": "p",
     "text": "Berlin'de 100'den fazla Noel pazarı kuruluyor; büyüklerin çoğu Totensonntag'dan sonraki Pazartesi, 23 Kasım'da açılıyor. Yani hafta sonu büyük pazarlar kapalı, Pazartesi ve Salı açık."
    },
    {
     "t": "table",
     "head": [
      "Pazar",
      "Nerede",
      "Tarih",
      "Giriş"
     ],
     "rows": [
      [
       "WeihnachtsZauber",
       "Gendarmenmarkt, Mitte",
       "23 Kas – 31 Ara",
       "€2 (Pzt–Cum 11–14 ücretsiz)"
      ],
      [
       "Rotes Rathaus",
       "TV Kulesi'nin dibi",
       "23 Kas – 3 Oca",
       "Ücretsiz"
      ],
      [
       "Schloss Charlottenburg",
       "Saray önü",
       "23 Kas – 27 Ara",
       "sitesine bak"
      ],
      [
       "Lucia (İskandinav)",
       "Kulturbrauerei, Prenzlauer Berg",
       "23 Kas'tan itibaren",
       "sitesine bak"
      ],
      [
       "Alexanderplatz",
       "Alexanderplatz",
       "23 Kas'tan itibaren",
       "genelde ücretsiz"
      ]
     ]
    },
    {
     "t": "list",
     "items": [
      "**Glühwein** (~€5–6) bardak depozitosuyla gelir: bardağı iade et ya da hatıra olarak sakla.",
      "**Ye:** Bratwurst, Reibekuchen, Grünkohl, Flammkuchen, şekerli kavrulmuş badem (gebrannte Mandeln), Lebkuchen.",
      "**Nakit** işi hızlandırır; çoğu tezgâh kart da alıyor.",
      "**Akşam** daha güzel ama daha kalabalık; cüzdan ve telefon önde."
     ]
    }
   ]
  },
  {
   "id": "food",
   "title": "Ne yemeli",
   "subtitle": "Döner, currywurst, Späti kültürü",
   "icon": "food",
   "blocks": [
    {
     "t": "p",
     "text": "Berlin ucuz ve çok kültürlü: Türk, Vietnam, Alman, vegan. Kulüp öncesi ve sonrası en iyi dostun döner ve Späti."
    },
    {
     "t": "special",
     "kind": "dishes"
    },
    {
     "t": "p",
     "text": "### Bilmen gerekenler"
    },
    {
     "t": "list",
     "items": [
      "**Späti:** köşe bakkalı; Pazar ve gece de açık, önünde oturup içilir.",
      "**Pfand:** şişe ve kutularda 8–25 cent depozito; marketteki makineye ya da Späti'ye iade.",
      "**Bahşiş:** %5–10; öderken toplamı söyle (“Zwanzig, bitte” = “20 olsun”).",
      "**Kart:** çoğu yerde geçiyor ama bazı bar, büfe ve Späti hâlâ nakit.",
      "**Pazar:** süpermarketler kapalı, Totensonntag'da da."
     ]
    }
   ]
  },
  {
   "id": "shopping",
   "title": "Ne almalı",
   "subtitle": "Plak, hediyelik, kulüp kıyafeti",
   "icon": "bag",
   "blocks": [
    {
     "t": "table",
     "head": [
      "Ne",
      "Nereden",
      "Not"
     ],
     "rows": [
      [
       "Tekno plak",
       "Hard Wax (Kraftwerk), Spacehall (Zossener Str. 35)",
       "Hard Wax Pazartesi–Cumartesi 15–20"
      ],
      [
       "Ampelmann hediyelik",
       "Ampelmann mağazaları (Hackesche Höfe)",
       "trafik ışığı adamı her şeyde"
      ],
      [
       "Çikolata",
       "Rausch Schokoladenhaus (Gendarmenmarkt)",
       "çikolatadan Brandenburger Tor"
      ],
      [
       "Gurme",
       "KaDeWe 6. kat",
       "Almanya'nın en ünlü mağazası"
      ],
      [
       "Kulüp ve fetiş kıyafeti",
       "Schwarzer Reiter (Torstraße 3), Blackstyle, Mister B",
       "KitKat için"
      ],
      [
       "Konsept ve tasarım",
       "Voo Store (Oranienstraße 24)",
       "Kreuzberg'de bir avluda"
      ],
      [
       "Ucuz bakım ürünleri",
       "dm ve Rossmann",
       "drogeri zincirleri"
      ],
      [
       "İçecek",
       "Berliner Luft (nane likörü), Club-Mate",
       "Späti'de"
      ]
     ]
    },
    {
     "t": "p",
     "text": "Mağazalar Pazar kapalı; Pazartesi açık. Tax-free alışveriş yalnızca AB dışında oturanlar için; İspanya'da oturduğun için geçerli değil."
    }
   ]
  },
  {
   "id": "move",
   "title": "Ulaşım",
   "subtitle": "BVG biletleri 2026, gece hatları, havalimanı",
   "icon": "metro",
   "blocks": [
    {
     "t": "table",
     "head": [
      "Bilet",
      "Fiyat",
      "Not"
     ],
     "rows": [
      [
       "Tek bilet AB",
       "€4,00",
       "2 saat, tek yön, aktarmalı"
      ],
      [
       "Tek bilet ABC",
       "€5,00",
       "BER havalimanı dahil"
      ],
      [
       "Kısa mesafe",
       "€2,80",
       "3 S/U-Bahn durağı"
      ],
      [
       "24 saat AB",
       "€11,20",
       "ilk kullanımdan itibaren 24 saat"
      ],
      [
       "24 saat ABC",
       "€12,90",
       "havalimanı günleri için"
      ]
     ]
    },
    {
     "t": "list",
     "items": [
      "**Planın:** Cmt BER'den ABC tek bilet (€5) → Cmt 23:15'te 24 saat AB (€11,20) → Pzt 12:15'te 24 saat AB (€11,20) → Sal öğleden sonra AB tek bilet (€4) → BER'e ABC tek bilet (€5). Toplam ~€36.",
      "Kâğıt bileti binmeden önce damgala; uygulamadaki bilet hazırdır. Biletsiz yakalanmanın cezası €60.",
      "Cuma ve Cumartesi geceleri S-Bahn ve U-Bahn bütün gece; hafta içi gece otobüsleri (N).",
      "BER'e: FEX (Hauptbahnhof, Gesundbrunnen, Ostkreuz), RE7 ve RB14 (Alexanderplatz, Friedrichstraße, Hauptbahnhof), S9 (Warschauer Straße, Ostkreuz).",
      "Bolt, Uber, FreeNow: gece Mitte ile Friedrichshain arası ~€12–18."
     ]
    }
   ]
  },
  {
   "id": "money",
   "title": "Para",
   "subtitle": "Kart, nakit ve euro–lira çevirici",
   "icon": "euro",
   "blocks": [
    {
     "t": "special",
     "kind": "converter"
    },
    {
     "t": "list",
     "items": [
      "Kart çoğu yerde geçer ama Berghain gibi kulüplerde, büfelerde ve Spätilerde nakit hazır olsun.",
      "Bankaların ATM'lerini kullan (Sparkasse, Deutsche Bank, Berliner Volksbank); bağımsız turistik ATM'ler yüksek ücret alır. Ekranda dönüştürme teklif edilirse reddet, euro olarak çek.",
      "İspanyol banka kartıyla euro bölgesinde kur farkı ödemezsin."
     ]
    }
   ]
  },
  {
   "id": "docs",
   "title": "Belgeler",
   "subtitle": "Pasaport, oturum kartı, kimlik kontrolü",
   "icon": "doc",
   "blocks": [
    {
     "t": "list",
     "items": [
      "**Pasaport + İspanya oturum kartı (TIE):** Schengen içinde ikisini birlikte taşı. Almanya'da yanında kimlik bulundurman gerekiyor.",
      "**Kulüpler:** 18 yaş sınırı; kapıda kimlik isteyebilirler, fotokopi değil aslı.",
      "**Uçuşlar:** Schengen içi uçuşta pasaport kontrolü yok ama havayolu binişte kimliğe bakar, rastgele polis kontrolü olabilir.",
      "**Reichstag:** kayıttaki isimle aynı belge (pasaport)."
     ]
    },
    {
     "t": "callout",
     "title": "Kaybedersen",
     "text": "Önce polis (Verlustanzeige), sonra T.C. Berlin Başkonsolosluğu (Heerstraße 21). Adımlar SOS sayfasında.",
     "tone": "accent"
    }
   ]
  },
  {
   "id": "phone",
   "title": "Telefon ve uygulamalar",
   "subtitle": "İspanyol hattın Almanya'da da geçerli",
   "icon": "signal",
   "blocks": [
    {
     "t": "p",
     "text": "İspanyol hattın AB içinde “evdeki gibi” roaming ile çalışır; ayrı eSIM gerekmez (paketindeki AB kotasına bak)."
    },
    {
     "t": "tags",
     "items": [
      "BVG Tickets",
      "BVG Fahrinfo",
      "DB Navigator",
      "Google Maps",
      "Resident Advisor (RA)",
      "Bolt / Uber / FreeNow",
      "Lufthansa",
      "Vueling",
      "Airbnb"
     ]
    }
   ]
  },
  {
   "id": "pack",
   "title": "Bavul ve hava",
   "subtitle": "Tek çanta, soğuk ve karanlık",
   "icon": "bag",
   "blocks": [
    {
     "t": "table",
     "head": [
      "Uçuş",
      "Ücretsiz bagaj"
     ],
     "rows": [
      [
       "Lufthansa (Economy Light)",
       "8 kg kabin bavulu 55×40×23 + küçük çanta 40×30×10"
      ],
      [
       "Vueling (Basic)",
       "yalnızca koltuk altına 40×30×20 çanta"
      ]
     ]
    },
    {
     "t": "p",
     "text": "İkisine de uyan en basit çözüm: 40×30×20'lik bir sırt çantası. Daha büyük bir şey getireceksen Vueling'de kabin bavulu ekle."
    },
    {
     "t": "p",
     "text": "Kasım sonu Berlin: gündüz 3–6°C, gece 0°C civarı, sık sık kapalı ve çiseleyen; güneş 16:05'te batıyor. Kulüp kuyruğunda uzun süre dışarıda bekleyeceğin için katmanlı giyin."
    },
    {
     "t": "special",
     "kind": "packing"
    },
    {
     "t": "callout",
     "title": "Kulüp kıyafeti tek çantada",
     "text": "Siyah tişört, siyah pantolon ve siyah ayakkabı hem gündüz hem gece iş görür. KitKat için tek bir parça (mesh üst ya da harness) ekle, yeter.",
     "tone": "gold"
    }
   ]
  },
  {
   "id": "safety",
   "title": "Güvenlik",
   "subtitle": "Berlin genelde güvenli; dikkat edilecekler",
   "icon": "shield",
   "blocks": [
    {
     "t": "list",
     "items": [
      "**Cep hırsızlığı:** Alexanderplatz, Warschauer Straße köprüsü, RAW-Gelände ve Noel pazarı kalabalığında.",
      "**Sokak satıcıları:** Görlitzer Park, RAW-Gelände ve Kottbusser Tor çevresinde uyuşturucu satışı yaygın; asla alma, içeriği belirsiz ve polis riski var.",
      "**Bisiklet yolları:** renkli şeritte yürüme, bisikletler hızlı geçer.",
      "**Kırmızı ışık:** Almanlar bekler, ceza da var.",
      "**Gece eve:** ışıklı caddeler ve S-Bahn; yorgunsan taksi."
     ]
    }
   ]
  },
  {
   "id": "depart",
   "title": "Dönüş günü, Salı 24 Kas",
   "subtitle": "Alexanderplatz 18:40 → BER → VY2003 20:40",
   "icon": "plane",
   "blocks": [
    {
     "t": "list",
     "ordered": true,
     "items": [
      "**Pazartesi akşamı:** çantanı topla, Vueling check-in'ini yap.",
      "**10:15:** check-out, anahtar.",
      "**11:05–12:35:** Bernauer Straße, Duvar Anıtı.",
      "**15:30:** TV Kulesi, gün batımı.",
      "**16:45:** Rotes Rathaus Noel pazarı, son yemek.",
      "**18:40:** Alexanderplatz'tan RE7/RB14 (saatine DB Navigator'da bak) ya da S9.",
      "**~19:15:** BER Terminal 1, güvenlik.",
      "**~20:20:** kapı kapanır; **20:40** kalkış, **23:20** Barcelona."
     ]
    },
    {
     "t": "p",
     "text": "BER'e en geç 19:30'da varmayı hedefle. Bölge treni kaçarsa S9 daha sık gelir."
    }
   ]
  },
  {
   "id": "budget",
   "title": "Bütçe",
   "subtitle": "Yerde ~€395 + uçuş + Airbnb",
   "icon": "euro",
   "blocks": [
    {
     "t": "p",
     "text": "Sütunlar: gezi ve biletler, yemek, gece, ulaşım. Alışveriş ayrı."
    },
    {
     "t": "special",
     "kind": "budget"
    },
    {
     "t": "list",
     "items": [
      "Uçuşlar: ~€211 (13 Kasım fiyatı).",
      "Airbnb: ilana göre + %7,5 Berlin konaklama vergisi.",
      "Bir gece: giriş + 3–4 içecek + su + vestiyer.",
      "Alışveriş: plak €12–20, hediyelik €10–30, kulüp kıyafeti €30–100."
     ]
    }
   ]
  },
  {
   "id": "phrases",
   "title": "Almanca",
   "subtitle": "Dokun, sesli dinle",
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
   "title": "Kaynaklar",
   "subtitle": "Bilgiler nereden",
   "icon": "book",
   "blocks": [
    {
     "t": "p",
     "text": "Saatler ve fiyatlar 13 Kasım 2026'da kontrol edildi; gitmeden önce resmi sitelere bir kez daha bak. Haritadaki noktalar OpenStreetMap'ten."
    },
    {
     "t": "list",
     "items": [
      "[Google Flights](https://www.google.com/travel/flights): uçuş saatleri ve fiyatlar",
      "[Tagesspiegel: Berlin'de dans yasağı saatleri](https://www.tagesspiegel.de/berlin/tanzverbot-in-berlin-droht-geldbusse-wenn-man-am-karfreitag-tanzt-9582800.html)",
      "[visitBerlin: 2026 Noel pazarları](https://www.visitberlin.de/en/blog/these-christmas-markets-open-first)",
      "[berlin.de: Mitte'deki Noel pazarları](https://www.berlin.de/en/christmas-markets/mitte/)",
      "[VBB: 2026 bilet fiyatları](https://www.vbb.de/news/neue-fahrpreise-im-vbb-zum-1-januar-2026/)",
      "[Bundestag: kubbe ziyareti](https://www.bundestag.de/besuche/kuppel-245686)",
      "[Stiftung Berliner Mauer](https://www.stiftung-berliner-mauer.de)",
      "[Topographie des Terrors](https://www.topographie.de)",
      "[Stiftung Denkmal](https://www.stiftung-denkmal.de)",
      "[SMB: Neues Museum biletleri](https://www.smb.museum/museen-einrichtungen/neues-museum/besuch-planen/preise-tickets/)",
      "[berlin.de: TV Kulesi, kapalı günler ve fiyat](https://www.berlin.de/sehenswuerdigkeiten/3560707-3558930-berlin-tv-tower.html)",
      "[Techno Airlines: kulüp programları](https://www.technoairlines.com/club/berghain)",
      "[Lufthansa Group: power bank kuralları](https://business.lufthansagroup.com/gb/en/program/experts/news/power-banks-on-board--updated-regulations-from-january-2026)",
      "[berlin.de: drug checking](https://www.berlin.de/en/news/8262563-5559700-drug-checking-free-anonymous-drug-testin.en.html)",
      "[service.berlin.de: konaklama vergisi %7,5](https://service.berlin.de/dienstleistung/326105/)",
      "[Auswärtiges Amt: Türkiye'nin Almanya'daki temsilcilikleri](https://www.auswaertiges-amt.de/de/service/laender/tuerkei-node/vertretungen-tuerkei-201970)"
     ]
    }
   ]
  }
 ],
 "sos": [
  {
   "label": "Acil durum (ambulans, itfaiye): ücretsiz, SIM'siz de çalışır",
   "value": "112",
   "big": true,
   "tel": "112"
  },
  {
   "label": "Polis",
   "value": "110",
   "tel": "110"
  },
  {
   "label": "Acil olmayan doktor, 7/24",
   "value": "116117",
   "tel": "116117"
  },
  {
   "label": "Zehir danışma hattı (Giftnotruf Berlin), 7/24",
   "value": "030 19240",
   "tel": "03019240"
  },
  {
   "label": "T.C. Berlin Büyükelçiliği",
   "value": "+49 30 275850 · Tiergartenstraße 19–21, 10785 Berlin",
   "tel": "+4930275850"
  },
  {
   "label": "T.C. Berlin Başkonsolosluğu (pasaport işleri)",
   "value": "Heerstraße 21, 14052 Berlin",
   "text": true
  },
  {
   "label": "Dışişleri Konsolosluk Çağrı Merkezi, 7/24",
   "value": "+90 312 292 29 29",
   "tel": "+903122922929"
  },
  {
   "label": "Friedrichshain'a en yakın büyük hastane (acil servis)",
   "value": "Vivantes Klinikum im Friedrichshain, Landsberger Allee 49",
   "text": true
  },
  {
   "label": "Nöbetçi eczane",
   "value": "Her eczanenin kapısında “Notdienst” listesi asılı",
   "text": true
  },
  {
   "label": "Kart ve sigorta",
   "value": "Bankanın kart bloke numarasını ve sigortanın 7/24 hattını önceden kaydet",
   "text": true
  }
 ],
 "sosSteps": [
  "Tehlikedeysen 112 ya da 110. Kartlarını bloke et.",
  "En yakın polis karakoluna git; kayıp için “Verlustanzeige”, çalınma için “Diebstahlanzeige” tutanağı al.",
  "T.C. Berlin Başkonsolosluğu'na (Heerstraße 21) başvur: acil seyahat belgesi için tutanak, fotoğraf ve kimlik bilgilerin gerekir.",
  "İspanya oturum kartın (TIE) da gittiyse bunu hem konsolosluğa hem havayoluna söyle: dönüşte İspanya'ya girişte belgeler sorulabilir.",
  "Polis tutanağı tek başına seni uçağa bindirmez: havayoluna haber ver, havalimanına erken git."
 ],
 "driverCard": [
  "Bitte bringen Sie mich zu:",
  "Simon-Dach-Straße",
  "10245 Berlin-Friedrichshain",
  "(meine Wohnung ist dort in der Nähe)",
  "Kann ich mit Karte zahlen? Danke!"
 ],
 "phrases": [
  [
   "Hallo / Guten Tag / Guten Abend",
   "halo / guten tak / guten abent",
   "Merhaba / İyi günler / İyi akşamlar"
  ],
  [
   "Danke / Bitte",
   "danke / bitte",
   "Teşekkürler / Rica ederim, lütfen"
  ],
  [
   "Entschuldigung",
   "ent-şul-di-gung",
   "Pardon, afedersiniz"
  ],
  [
   "Sprechen Sie Englisch?",
   "şpre-hın zi eng-liş",
   "İngilizce konuşuyor musunuz?"
  ],
  [
   "Ein Bier, bitte / Eine Mate, bitte",
   "ayn bir bitte / ayne mate bitte",
   "Bir bira lütfen / Bir Club-Mate lütfen"
  ],
  [
   "Mit Karte, bitte",
   "mit karte bitte",
   "Kartla lütfen"
  ],
  [
   "Nur Bargeld?",
   "nur bar-gelt",
   "Sadece nakit mi?"
  ],
  [
   "Einmal Döner mit allem, scharf",
   "ayn-mal döner mit allem, şarf",
   "Bir döner, her şeyiyle, acılı"
  ],
  [
   "Currywurst ohne Darm, mit Pommes",
   "köri-vurst ohne darm, mit pommes",
   "Kabuksuz currywurst, patatesli"
  ],
  [
   "Einen Glühwein, bitte",
   "aynen glü-vayn bitte",
   "Bir Glühwein lütfen"
  ],
  [
   "Den Pfand, bitte",
   "den pfant bitte",
   "Depozitomu geri alabilir miyim"
  ],
  [
   "Wo ist die Toilette?",
   "vo ist di toalette",
   "Tuvalet nerede?"
  ],
  [
   "Die Rechnung, bitte / Stimmt so",
   "di reh-nung bitte / ştimt zo",
   "Hesap lütfen / Üstü kalsın"
  ],
  [
   "Wie viel kostet das?",
   "vi fil kostet das",
   "Bu ne kadar?"
  ],
  [
   "Ist hier noch frei?",
   "ist hir noh fray",
   "Burası boş mu?"
  ],
  [
   "Wo ist die Garderobe?",
   "vo ist di garderobe",
   "Vestiyer nerede?"
  ],
  [
   "Ich brauche einen Arzt",
   "ih brau-he aynen artst",
   "Doktora ihtiyacım var"
  ],
  [
   "Hilfe!",
   "hilfe",
   "İmdat!"
  ]
 ],
 "meetPhrases": [
  [
   "Hi! Ich bin …, aus Barcelona.",
   "hay! ih bin …, aus barselona",
   "Selam! Ben …, Barselona'dan."
  ],
  [
   "Bist du aus Berlin?",
   "bist du aus berlin",
   "Berlinli misin?"
  ],
  [
   "Mein erstes Mal in Berlin.",
   "mayn erstes mal in berlin",
   "Berlin'e ilk gelişim."
  ],
  [
   "Wer legt gerade auf?",
   "ver lekt gerade auf",
   "Şu an kim çalıyor?"
  ],
  [
   "Krasses Set!",
   "krasses set",
   "Müthiş set!"
  ],
  [
   "Gehst du heute noch woanders hin?",
   "gest du hoyte noh vo-anders hin",
   "Bu gece başka bir yere gidiyor musun?"
  ],
  [
   "Kennst du gute Partys diese Woche?",
   "kenst du gute partis dize vohe",
   "Bu hafta iyi parti biliyor musun?"
  ],
  [
   "Willst du was trinken?",
   "vilst du vas trinken",
   "Bir şey içmek ister misin?"
  ],
  [
   "Sollen wir Insta tauschen?",
   "zollen vir insta tauşen",
   "Instagram'ları değişelim mi?"
  ],
  [
   "Alles gut bei dir?",
   "alles gut bay dir",
   "İyi misin, her şey yolunda mı?"
  ],
  [
   "Nein, danke.",
   "nayn danke",
   "Hayır, teşekkürler."
  ],
  [
   "Ich gehe jetzt, war schön!",
   "ih gee yetst, var şön",
   "Ben kaçıyorum, güzeldi!"
  ],
  [
   "Schönen Abend noch!",
   "şönen abent noh",
   "İyi eğlenceler, iyi akşamlar!"
  ]
 ],
 "budget": [
  {
   "dayId": "sat",
   "label": "Cmt 21",
   "values": [
    0,
    35,
    45,
    16.2
   ],
   "notes": [
    "East Side Gallery ücretsiz",
    "Burger + akşam + su",
    "RSO ~€25 + içecek",
    "ABC €5 + 24 saat AB €11,20"
   ]
  },
  {
   "dayId": "sun",
   "label": "Paz 22",
   "values": [
    0,
    45,
    50,
    0
   ],
   "notes": [
    "Hepsi ücretsiz",
    "Brunch + Käsespätzle",
    "Berghain ~€30 + içecek",
    "24 saatlik bilet hâlâ geçerli"
   ]
  },
  {
   "dayId": "mon",
   "label": "Pzt 23",
   "values": [
    2,
    45,
    60,
    11.2
   ],
   "notes": [
    "Gendarmenmarkt €2",
    "Döner + Noel pazarı",
    "KitKat + Tresor + içecek",
    "24 saat AB; taksi gerekirse +€15"
   ]
  },
  {
   "dayId": "tue",
   "label": "Sal 24",
   "values": [
    40.5,
    35,
    0,
    9
   ],
   "notes": [
    "Neues €14 + TV Kulesi €26,50",
    "Currywurst + Noel pazarı",
    "",
    "AB €4 + ABC €5"
   ]
  }
 ],
 "nightCards": [
  {
   "num": "XXI",
   "day": "Cmt",
   "title": "RSO: ilk gece",
   "text": "Schöneweide'deki dev endüstri yapısında sert tekno; Totensonntag yüzünden 04:00'te biter.",
   "scene": "club",
   "dayId": "sat"
  },
  {
   "num": "XXII",
   "day": "Paz",
   "title": "Berghain",
   "text": "Dans yasağı 21:00'de biter; kuyruk kısa, kapı yine sert. Siyah, sakin, tek.",
   "scene": "club",
   "dayId": "sun"
  },
  {
   "num": "XXIII",
   "day": "Pzt",
   "title": "KitKat ve Tresor",
   "text": "Electric Monday'de rahat dress code, telefon yok; sonra 3 dk yürü, Tresor'un bodrum kasası.",
   "scene": "club",
   "dayId": "mon"
  },
  {
   "num": "XXIV",
   "day": "Sal",
   "title": "Uçuştan önce Glühwein",
   "text": "Rotes Rathaus Noel pazarı, dönme dolap; 18:40'ta havalimanı yolunda.",
   "scene": "market",
   "dayId": "tue"
  }
 ],
 "meet": [
  {
   "id": "ra-who-is-going",
   "kind": "app",
   "icon": "speaker",
   "title": "RA: aynı partiye kim gidiyor",
   "text": "Resident Advisor'da etkinliğe ilgileniyorum de; tek başına gelenler Instagram'da ve Reddit'te kuyruk arkadaşı arar.",
   "when": "Gitmeden önce",
   "link": {
    "label": "RA: Berlin etkinlikleri",
    "url": "https://ra.co/events/de/berlin"
   },
   "ask": "Solo raver from Barcelona: anyone heading to RSO this Saturday? Happy to meet at Schöneweide station around 23:45."
  },
  {
   "id": "reddit-berlinsocialclub",
   "kind": "app",
   "icon": "chat",
   "title": "r/berlinsocialclub",
   "text": "Berlin'e yeni gelenlerin ve tek gezenlerin buluştuğu subreddit; hafta sonu kim çıkıyor başlıkları çok.",
   "link": {
    "label": "Reddit",
    "url": "https://www.reddit.com/r/berlinsocialclub/"
   },
   "ask": "Visiting Berlin 21 to 24 Nov from Barcelona. Techno lover: RSO on Saturday, Berghain on Sunday, KitKat and Tresor on Monday. Anyone want to join?"
  },
  {
   "id": "free-walk-cold-war",
   "kind": "tour",
   "icon": "walk",
   "title": "Ücretsiz yürüyüş turu: Duvar ve Soğuk Savaş",
   "text": "Bahşişli turlar her gün Mitte'den kalkar; Pazar sabahı tanışmanın kolay yolu.",
   "when": "Her gün, sabah",
   "dayId": "sun",
   "link": {
    "label": "GuruWalk Berlin",
    "url": "https://www.guruwalk.com/berlin"
   },
   "ask": "Anyone joining a free Cold War walking tour this Sunday morning?"
  },
  {
   "id": "reichstag-sunset",
   "kind": "event",
   "icon": "sunset",
   "title": "Reichstag kubbesinde gün batımı",
   "text": "Rampada herkes aynı manzaraya bakıyor; birine fotoğrafını çekmeyi teklif etmek iyi bir başlangıç.",
   "when": "Paz 22 Kas, 15:45",
   "dayId": "sun",
   "ask": "Anyone else at the Reichstag dome for sunset on Sunday at 15:45?"
  },
  {
   "id": "electric-monday",
   "kind": "event",
   "icon": "night",
   "title": "Electric Monday at KitKat",
   "text": "Pazartesinin en sosyal kulübü: rahat dress code, ücretsiz vestiyer ve meyve büfesi. İçeride telefon yok, insanlar gerçekten konuşuyor.",
   "when": "Pzt 23 Kas, 22:00",
   "dayId": "mon",
   "link": {
    "label": "KitKatClub",
    "url": "https://www.kitkat.club"
   },
   "ask": "Electric Monday at KitKat tonight, then Tresor. Anyone in? Meeting around 22:30 near Heinrich-Heine-Strasse."
  },
  {
   "id": "gendarmenmarkt-gluehwein",
   "kind": "place",
   "icon": "star",
   "title": "Noel pazarında Glühwein masası",
   "text": "Ayakta içilen yuvarlak masalar Berlin'in en kolay sohbet yeri: **Ist hier noch frei?** (Burası boş mu?) diye sor.",
   "when": "Pzt 23 Kas, 18:00",
   "dayId": "mon",
   "ask": "Opening night at the Gendarmenmarkt Christmas market: Glühwein around 18:00, anyone?"
  },
  {
   "id": "simon-dach-bars",
   "kind": "place",
   "icon": "glass",
   "title": "Simon-Dach-Straße barları",
   "text": "Evinin dibinde; kulüpten önce bir bira için en kolay yer, tezgâhlar kalabalık ve rahat.",
   "when": "Her akşam",
   "dayId": "sat",
   "ask": "Pre-drinks on Simon-Dach-Strasse before RSO tonight? Around 22:00."
  },
  {
   "id": "queue-quiet-tip",
   "kind": "tip",
   "icon": "info",
   "title": "Kuyrukta değil, içeride tanış",
   "text": "Berghain ve KitKat kuyruğunda sessiz durmak avantaj; sohbeti içeriye, bara ve chill-out alanlarına sakla."
  },
  {
   "id": "awareness-tip",
   "kind": "tip",
   "icon": "shield",
   "title": "Rıza ve awareness ekipleri",
   "text": "Berlin kulüplerinde awareness ekipleri var: rahatsız olursan ya da birinin durumu kötüyse onlara git. Dokunmadan önce sor."
  }
 ],
 "createdAt": "2026-11-13T00:00:00.000Z",
 "updatedAt": "2026-11-13T00:00:00.000Z"
}
