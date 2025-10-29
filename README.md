# Braid & Barber Hub

A React Native Expo app for booking braid specialists and barbers, built with Supabase backend.

## Features

- 🔍 **Search & Discovery**: Find stylists by city and category
- 👆 **Swipe Gestures**: Swipe left for favorites, right to open profile
- 💳 **Payment Integration**: 50% deposit system with Swish, Klarna, and Apple Pay
- 📱 **Modern UI**: Clean, intuitive interface with Swedish localization
- 🔄 **Real-time Data**: Supabase integration with fallback demo mode

## Tech Stack

- **Frontend**: React Native + Expo
- **Navigation**: React Navigation v6
- **Gestures**: React Native Gesture Handler
- **Backend**: Supabase (PostgreSQL)
- **Language**: TypeScript
- **Platform**: iOS, Android, Web

## Quick Start

### Prerequisites

- Node.js 18+ 
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Supabase credentials:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

3. **Set up Supabase database:**
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to SQL Editor and run the contents of `supabase-schema.sql`
   - Copy your project URL and anon key to `.env`

4. **Start the development server:**
   ```bash
   npm start
   ```

5. **Run on device/simulator:**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on your phone

## App Structure

### Screens

1. **Home** - Search by city and category
2. **List** - Browse stylists with swipe gestures
3. **Profile** - View stylist details and services
4. **Booking** - Select time slot and confirm
5. **Checkout** - Payment with 50% deposit system

### Key Features

- **Swipe Navigation**: 
  - Swipe left on stylist card → Add to favorites
  - Swipe right on stylist card → Open profile
- **Payment Flow**: 
  - 50% deposit required to lock time slot
  - Remaining 50% paid after service completion
  - Multiple payment methods supported
- **Demo Mode**: Works without Supabase using mock data

## Database Schema

The app uses the following main tables:

- `stylists` - Hair stylist and barber profiles
- `services` - Available services with pricing
- `slots` - Available time slots
- `bookings` - Customer bookings
- `favorites` - User favorites

## Development

### Project Structure

```
├── App.tsx                 # Main app component
├── package.json           # Dependencies
├── app.json              # Expo configuration
├── tsconfig.json         # TypeScript config
├── babel.config.js       # Babel config
├── .env.example          # Environment variables template
└── supabase-schema.sql   # Database schema
```

### Available Scripts

- `npm start` - Start Expo development server
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS
- `npm run web` - Run on web

### Environment Variables

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key |

## Demo Mode

If Supabase credentials are not provided, the app runs in demo mode with:
- Mock stylist data
- Simulated time slots
- Fake payment processing
- Local favorites storage

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
