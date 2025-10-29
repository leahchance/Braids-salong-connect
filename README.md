# 🎨 Braid & Barber Hub - En-fils App

En komplett **React Native + Expo**-app för bokning av flätor, sew-ins, wig installs och barber-tjänster. Med **Supabase**-integration för databas, autentisering och betalning via **Swish/Klarna/Apple Pay** (stubs).

## ✨ Funktioner

- 🔍 **Sökning av frisörer** efter stad och kategori (Box Braids, Knotless, Sew-In, Wig Install, Barber: Fade, Kids Braids)
- 👆 **Swipe-gester**: Vänster = Favorit, Höger = Öppna profil
- 📅 **Bokningssystem** med tidslots-väljare
- 💰 **Deposition 50%** med resterande betalning efter tjänst
- 💳 **Betalningsmetoder**: Swish, Klarna, Apple Pay (mockade)
- 🔔 **Push-notifikationer** via Expo Notifications
- 🎭 **Demo-läge**: Fungerar utan Supabase för utveckling

## 📱 Skärmar

1. **Home** - Sök frisörer efter stad och kategori
2. **List** - Resultat med swipe-funktionalitet
3. **Profile** - Frisörens tjänster och information
4. **Booking** - Välj tid och datum
5. **Checkout** - Betalning med deposition och slutbetalning

## 🚀 Kom igång

### Förutsättningar

- **Node.js** (v18 eller senare)
- **npm** eller **yarn**
- **Expo CLI**: `npm install -g expo-cli`
- **Expo Go**-appen på din mobil (iOS/Android)

### Installation

1. **Klona projektet** (om det inte redan är gjort)
   ```bash
   git clone https://github.com/leahchance/Braids-salong-connect.git
   cd workspace
   ```

2. **Installera dependencies**
   ```bash
   npm install
   ```

3. **Konfigurera miljövariabler**
   ```bash
   cp .env.example .env
   ```
   
   Redigera `.env` och lägg till dina Supabase-credentials:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

4. **Starta utvecklingsservern**
   ```bash
   npm start
   ```

5. **Kör på enhet**
   - Scanna QR-koden med **Expo Go**-appen (iOS/Android)
   - Eller tryck `a` för Android-emulator / `i` för iOS-simulator

## 🗄️ Supabase Setup

### 1. Skapa ett Supabase-projekt
Gå till [supabase.com](https://supabase.com) och skapa ett nytt projekt.

### 2. Databas-schema

Skapa följande tabeller i Supabase SQL Editor:

```sql
-- Stylists (frisörer)
CREATE TABLE stylists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  display_name TEXT,
  salon_name TEXT,
  offers_mobile BOOLEAN DEFAULT false,
  base_city TEXT,
  rating DECIMAL(2,1) DEFAULT 0,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Services (tjänster)
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stylist_id UUID REFERENCES stylists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  base_price_cents INTEGER NOT NULL,
  duration_min INTEGER NOT NULL,
  allow_addons BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Availability (tider)
CREATE TABLE availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stylist_id UUID REFERENCES stylists(id) ON DELETE CASCADE,
  start_ts TIMESTAMP NOT NULL,
  end_ts TIMESTAMP NOT NULL,
  is_booked BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Bookings (bokningar)
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stylist_id UUID REFERENCES stylists(id),
  service_id UUID REFERENCES services(id),
  starts_at TIMESTAMP NOT NULL,
  ends_at TIMESTAMP NOT NULL,
  price_cents INTEGER NOT NULL,
  deposit_cents INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'unpaid',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. RPC Functions

```sql
-- Sök frisörer
CREATE OR REPLACE FUNCTION search_stylists(city_q TEXT, category_q TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  salon_name TEXT,
  offers_mobile BOOLEAN,
  base_city TEXT,
  rating DECIMAL,
  avatar_url TEXT,
  services JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.display_name,
    s.salon_name,
    s.offers_mobile,
    s.base_city,
    s.rating,
    s.avatar_url,
    COALESCE(
      json_agg(
        json_build_object(
          'id', sv.id,
          'title', sv.title,
          'category', sv.category,
          'base_price_cents', sv.base_price_cents,
          'duration_min', sv.duration_min,
          'allow_addons', sv.allow_addons
        )
      ) FILTER (WHERE sv.id IS NOT NULL),
      '[]'::json
    )::jsonb AS services
  FROM stylists s
  LEFT JOIN services sv ON sv.stylist_id = s.id
  WHERE s.base_city ILIKE '%' || city_q || '%'
    AND (category_q IS NULL OR sv.category ILIKE '%' || category_q || '%')
  GROUP BY s.id;
END;
$$ LANGUAGE plpgsql;

-- Lista lediga tider
CREATE OR REPLACE FUNCTION list_open_slots(stylist UUID)
RETURNS TABLE (
  id UUID,
  stylist_id UUID,
  start_ts TIMESTAMP,
  end_ts TIMESTAMP,
  is_booked BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT a.id, a.stylist_id, a.start_ts, a.end_ts, a.is_booked
  FROM availability a
  WHERE a.stylist_id = stylist
    AND a.is_booked = false
    AND a.start_ts > NOW()
  ORDER BY a.start_ts ASC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;
```

### 4. Test-data

```sql
-- Lägg till testfrisörer
INSERT INTO stylists (display_name, base_city, rating, avatar_url) VALUES
  ('Ama — Knotless Pro', 'Stockholm', 4.8, 'https://placehold.co/300x300'),
  ('Bella — Sew-in & Wigs', 'Stockholm', 4.6, 'https://placehold.co/300x300'),
  ('Kofi — Barber Fade', 'Stockholm', 4.7, 'https://placehold.co/300x300');

-- Lägg till tjänster
INSERT INTO services (stylist_id, title, category, base_price_cents, duration_min, allow_addons) VALUES
  ((SELECT id FROM stylists WHERE display_name LIKE 'Ama%'), 'Knotless braids (mid back)', 'Knotless', 250000, 240, true),
  ((SELECT id FROM stylists WHERE display_name LIKE 'Bella%'), 'Sew-In install', 'Sew-In', 220000, 180, true),
  ((SELECT id FROM stylists WHERE display_name LIKE 'Kofi%'), 'Fade + line-up', 'Barber: Fade', 45000, 45, false);

-- Lägg till lediga tider (exempel)
INSERT INTO availability (stylist_id, start_ts, end_ts, is_booked) VALUES
  ((SELECT id FROM stylists LIMIT 1), NOW() + INTERVAL '2 hours', NOW() + INTERVAL '4 hours', false),
  ((SELECT id FROM stylists LIMIT 1), NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 2 hours', false);
```

## 🎯 Demo-läge

Appen fungerar **utan Supabase** med mock-data. Du ser ett diagnostik-meddelande på hemsidan:

```
⚠️ Körs i DEMO-läge (mockdata). Lägg in env för riktig data.
```

För att aktivera full funktionalitet, lägg till dina Supabase-credentials i `.env`.

## 📦 Teknisk Stack

- **React Native** 0.82
- **Expo** 54
- **TypeScript**
- **React Navigation** 7
- **React Native Gesture Handler** 2.x
- **Supabase** 2.x
- **Expo Notifications**

## 🧪 Testning

Kör appen i Expo Go och testa:

1. ✅ Sök efter "Stockholm" och välj kategori
2. ✅ Svep vänster på en frisör för att markera som favorit
3. ✅ Svep höger eller tryck för att öppna profil
4. ✅ Välj en tjänst och boka tid
5. ✅ Genomför betalning med mockade metoder

## 🔧 Byggkommando

För produktion:

```bash
# Android
npm run android

# iOS
npm run ios

# Web
npm run web
```

## 📄 Projektstruktur

```
.
├── App.tsx              # Huvudfil med alla screens
├── app.json             # Expo-konfiguration
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript-konfiguration
├── babel.config.js      # Babel-konfiguration
├── metro.config.js      # Metro bundler-konfiguration
├── .env.example         # Mall för miljövariabler
├── .env                 # Dina miljövariabler (gitignore)
└── assets/              # Bilder och ikoner
```

## 🐛 Felsökning

### Problem: "Module not found"
```bash
npm install
npm start --clear
```

### Problem: Gesture handler fungerar inte
Se till att `babel.config.js` har `react-native-reanimated/plugin`.

### Problem: Supabase ansluter inte
1. Verifiera att `.env` har rätt värden
2. Kontrollera att tabeller och RPC-funktioner finns
3. Kolla Supabase-projektets API-inställningar

## 📞 Support

För frågor eller problem, öppna en issue på [GitHub](https://github.com/leahchance/Braids-salong-connect/issues).

## 📜 Licens

ISC License

---

**Gjord med ❤️ för braid & barber-communityn**
