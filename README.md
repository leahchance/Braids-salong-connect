# Braid & Barber Hub 🎯

En modern bokningsapp för afrikanska flätor och barber-tjänster byggd med Expo och Supabase.

## ✨ Funktioner

- **Sök & Hitta**: Sök efter stylister och barbers i din stad
- **Kategorier**: Box Braids, Knotless, Sew-In, Wig Install, Barber Fade, Kids Braids
- **Svep-gester**: Svep vänster för favoriter, höger för att öppna profil
- **Bokning**: Välj tid och tjänst med 50% deposition
- **Betalning**: Stöd för Swish, Klarna och Apple Pay
- **Demo-läge**: Fungerar med mockdata utan Supabase

## 🚀 Snabbstart

### Förutsättningar

- Node.js (v16 eller senare)
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator / Android Emulator eller Expo Go-appen

### Installation

1. **Klona och installera**
```bash
git clone <repository-url>
cd braid-barber-hub
npm install
```

2. **Konfigurera miljövariabler**
```bash
cp .env.example .env
# Redigera .env med dina Supabase-uppgifter (valfritt för demo)
```

3. **Starta utvecklingsservern**
```bash
npm start
# eller
expo start
```

4. **Öppna appen**
- Scanna QR-koden med Expo Go (mobil)
- Tryck 'i' för iOS Simulator
- Tryck 'a' för Android Emulator

## 🗄️ Supabase Setup (Valfritt)

Appen fungerar i demo-läge utan Supabase, men för full funktionalitet:

1. **Skapa Supabase-projekt** på [supabase.com](https://supabase.com)

2. **Lägg till miljövariabler** i `.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

3. **Skapa tabeller** (exempel SQL):
```sql
-- Stylists table
CREATE TABLE stylists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  display_name TEXT,
  salon_name TEXT,
  base_city TEXT,
  rating DECIMAL(2,1),
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Services table
CREATE TABLE services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stylist_id UUID REFERENCES stylists(id),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  base_price_cents INTEGER NOT NULL,
  duration_min INTEGER NOT NULL,
  allow_addons BOOLEAN DEFAULT false
);

-- Bookings table
CREATE TABLE bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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

## 📱 Skärmar & Navigation

1. **Home** - Sök efter stad och kategori
2. **List** - Visa stylister med svep-funktioner
3. **Profile** - Visa stylist-profil och tjänster
4. **Booking** - Välj tid för bokning
5. **Checkout** - Betalning med deposition

## 🎨 Design & UX

- **Minimalistisk design** med fokus på användarvänlighet
- **Svep-gester** för snabb interaktion
- **Responsiv layout** för alla skärmstorlekar
- **Tydlig visuell feedback** för användaråtgärder

## 🛠️ Teknisk Stack

- **Frontend**: React Native + Expo
- **Navigation**: React Navigation v6
- **Gester**: React Native Gesture Handler
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Betalning**: Stub-implementationer för Swish/Klarna/Apple Pay
- **TypeScript**: Full typsäkerhet

## 📝 Utveckling

### Tillgängliga Scripts

```bash
npm start          # Starta Expo dev server
npm run android    # Öppna Android emulator
npm run ios        # Öppna iOS simulator
npm run web        # Öppna i webbläsare
npm run lint       # Kör ESLint
npm run type-check # TypeScript type checking
```

### Projektstruktur

```
├── App.tsx              # Huvudkomponent med navigation
├── package.json         # Dependencies och scripts
├── app.json            # Expo konfiguration
├── tsconfig.json       # TypeScript konfiguration
├── babel.config.js     # Babel konfiguration
├── .env.example        # Miljövariabler mall
└── README.md           # Denna fil
```

## 🔧 Anpassning

### Lägg till nya kategorier
Redigera `chips`-arrayen i `App.tsx`:
```typescript
const chips = ["Box Braids", "Knotless", "Din Kategori"];
```

### Ändra betalningsmetoder
Uppdatera `PaymentMethod` type och `CheckoutScreen`:
```typescript
type PaymentMethod = "swish" | "klarna" | "applepay" | "card";
```

### Anpassa demo-data
Modifiera `demoStylists()` funktionen för olika testdata.

## 🚀 Deployment

### Expo Application Services (EAS)

1. **Installera EAS CLI**
```bash
npm install -g eas-cli
```

2. **Konfigurera projekt**
```bash
eas build:configure
```

3. **Bygg för produktion**
```bash
eas build --platform all
```

4. **Publicera uppdateringar**
```bash
eas update
```

## 🤝 Bidrag

1. Forka projektet
2. Skapa en feature branch (`git checkout -b feature/amazing-feature`)
3. Commita dina ändringar (`git commit -m 'Add amazing feature'`)
4. Pusha till branch (`git push origin feature/amazing-feature`)
5. Öppna en Pull Request

## 📄 Licens

Detta projekt är licensierat under MIT License - se [LICENSE](LICENSE) filen för detaljer.

## 🙏 Erkännanden

- Expo team för det fantastiska utvecklingsverktyget
- Supabase för backend-as-a-service
- React Navigation för navigation
- Alla bidragsgivare och testare

---

**Gjort med ❤️ för afrikansk hårkultur och barbering**
