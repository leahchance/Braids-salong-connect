# 🚀 Quick Start Guide

## Start the App (3 Steps)

### 1. Install Dependencies (if not already done)
```bash
npm install
```

### 2. Start Development Server
```bash
npm start
```

### 3. Open on Your Device
- **Expo Go (iOS/Android)**: Scan the QR code
- **iOS Simulator**: Press `i` in terminal
- **Android Emulator**: Press `a` in terminal
- **Web Browser**: Press `w` in terminal

## Demo Mode

The app works immediately in **demo mode** with mock data:
- 3 sample stylists (Ama, Bella, Kofi)
- Mock services (Knotless braids, Sew-in, Barber fade)
- Fake time slots
- Payment stubs (no real transactions)

## Add Real Data (Optional)

1. Create Supabase project: https://supabase.com
2. Copy credentials to `.env`:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
3. Run SQL scripts from `README.md`
4. Restart app

## Test Features

✅ Search by city (Stockholm, Göteborg, etc.)
✅ Filter by category (Box Braids, Knotless, Barber: Fade)
✅ **Swipe left** on stylist card → Add to favorites
✅ **Swipe right** on stylist card → Open profile
✅ Tap on card → Open profile
✅ Book service → Select time slot
✅ Checkout → Choose payment method (Swish/Klarna/Apple Pay)

## Troubleshooting

**Metro bundler errors?**
```bash
npm start -- --clear
```

**Module not found?**
```bash
rm -rf node_modules && npm install
```

**Gesture handler not working?**
- Restart Expo Go app
- Check `babel.config.js` has reanimated plugin

## 📚 Full Documentation

See `README.md` for complete setup guide, Supabase configuration, and architecture details.

---

**Ready to code! 🎉**
