# TriviaCash 🎮💰

A modern, real-time multiplayer trivia game built with React Native and Expo. Compete against friends or test your knowledge solo while managing your virtual wallet and climbing the leaderboards.

## ✨ Features

### Game Modes
- **Single Player Mode**: Practice your trivia skills with timed questions across multiple categories
- **Multiplayer Mode**: Challenge friends in real-time competitive trivia matches

### Core Features
- 🎯 **Real-time Gameplay**: Live multiplayer matches powered by Supabase Realtime
- 💰 **Virtual Wallet System**: Earn and spend credits on games
- 📊 **Leaderboards**: Track your performance and compete with others
- ⏱️ **Timed Questions**: Answer within the time limit to maximize your score
- 🎨 **Modern UI**: Neon-themed design with smooth animations
- 📱 **Cross-platform**: Runs on iOS, Android, and Web

## 🛠️ Tech Stack

- **Framework**: [Expo](https://expo.dev) ~54.0
- **Language**: TypeScript
- **UI Library**: React Native 0.81.5
- **Backend**: [Supabase](https://supabase.com) (PostgreSQL + Realtime)
- **Routing**: Expo Router (file-based routing)
- **State Management**: React Hooks & Context API
- **Styling**: React Native StyleSheet with Linear Gradients

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** (v18 or higher recommended)
- **npm** or **yarn**
- **Expo CLI** (installed globally or via npx)
- A **Supabase account** (for multiplayer features)
- **iOS Simulator** (for Mac) or **Android Emulator** (optional, can use Expo Go app)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/akhilmor/TriviaCash.git
cd trivia-cash
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Supabase (Optional for Single Player)

Multiplayer mode requires Supabase setup. For single player mode, you can skip this step.

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the database schema (see `database/schema.sql` or `SUPABASE_SETUP.md`)
3. Get your Supabase URL and anon key from Project Settings → API

#### Option A: Environment Variables (Recommended)

Create a `.env` file in the root directory:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### Option B: app.json Configuration

Edit `app.json` and update the `extra` section:

```json
{
  "expo": {
    "extra": {
      "supabaseUrl": "your_supabase_project_url",
      "supabaseAnonKey": "your_supabase_anon_key"
    }
  }
}
```

**⚠️ Important**: Never commit your `.env` file or API keys to version control.

### 4. Start the Development Server

```bash
npm start
```

This will start the Expo development server. You can then:

- Press `i` to open in iOS Simulator
- Press `a` to open in Android Emulator
- Scan the QR code with Expo Go app on your device
- Press `w` to open in web browser

### 5. Run Platform-Specific Commands

```bash
# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

## 📁 Project Structure

```
trivia-cash/
├── app/                    # Expo Router app directory
│   ├── components/         # Reusable UI components
│   │   ├── NeonButton.tsx
│   │   ├── NeonCard.tsx
│   │   ├── QuestionTimer.tsx
│   │   ├── WalletBalance.tsx
│   │   └── ...
│   ├── constants/          # App constants
│   │   ├── colors.ts
│   │   ├── gameSettings.ts
│   │   └── questions.ts
│   ├── contexts/           # React Context providers
│   │   └── GameModeContext.tsx
│   ├── hooks/              # Custom React hooks
│   │   ├── useTriviaEngine.ts
│   │   ├── useMultiplayerTriviaEngine.ts
│   │   ├── useWallet.ts
│   │   ├── useSupabase.ts
│   │   └── ...
│   ├── screens/            # Screen components
│   │   ├── HomeScreen.tsx
│   │   ├── LobbyScreen.tsx
│   │   ├── QuestionScreen.tsx
│   │   ├── GameScreen.tsx
│   │   ├── MatchmakingScreen.tsx
│   │   ├── ResultsScreen.tsx
│   │   └── WalletScreen.tsx
│   ├── services/           # API services
│   │   └── questionsService.ts
│   ├── types/              # TypeScript type definitions
│   │   └── multiplayer.ts
│   └── utils/              # Utility functions
│       ├── botEngine.ts
│       └── fetchGuard.ts
├── database/               # Database schema files
│   └── schema.sql
├── lib/                    # Library configurations
│   └── supabaseClient.ts
├── assets/                 # Images, fonts, etc.
├── app.json               # Expo configuration
├── package.json           # Dependencies
└── tsconfig.json          # TypeScript configuration
```

## 🎮 How to Play

### Single Player Mode

1. Select "Single Player" from the home screen
2. Choose a trivia category
3. Answer questions within the time limit
4. Review your results and earn credits

### Multiplayer Mode

1. Select "Multiplayer" from the home screen
2. Wait for matchmaking to find an opponent
3. Both players answer the same questions simultaneously
4. The player with the highest score wins

## 🔧 Configuration

### Game Settings

Game settings can be customized in `app/constants/gameSettings.ts`:

- Question timer duration
- Number of questions per game
- Scoring rules

### Theme & Colors

Colors and theme settings are defined in `app/constants/colors.ts` and `app/constants/theme.ts`.

## 🗄️ Database Setup

For multiplayer functionality, you need to set up the Supabase database:

1. Go to your Supabase project SQL Editor
2. Copy and run the contents of `database/schema.sql`
3. Enable Realtime for the `rooms` and `room_events` tables
4. Configure Row Level Security (RLS) policies as needed

See `SUPABASE_SETUP.md` for detailed instructions.

## 🧪 Development

### Running Linter

```bash
npm run lint
```

### Type Checking

TypeScript type checking runs automatically in your editor. You can also run:

```bash
npx tsc --noEmit
```

### Building for Production

```bash
# iOS
eas build --platform ios

# Android
eas build --platform android
```

Note: You'll need to set up [Expo Application Services (EAS)](https://docs.expo.dev/build/introduction/) for production builds.

## 🐛 Troubleshooting

### Supabase Connection Issues

- Verify your Supabase URL and anon key are correct
- Ensure your Supabase project is active (not paused)
- Check that Realtime is enabled for required tables
- Review `SUPABASE_SETUP.md` for detailed troubleshooting

### Metro Bundler Issues

If you encounter bundler errors:

```bash
npm start -- --clear
```

### TypeScript Errors

If you see TypeScript errors after pulling changes:

```bash
rm -rf node_modules
npm install
```

## 📝 Environment Variables

The following environment variables are used:

- `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous/public API key

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is private and proprietary.

## 🙏 Acknowledgments

- Trivia questions powered by [Open Trivia Database](https://opentdb.com/)
- Built with [Expo](https://expo.dev) and [React Native](https://reactnative.dev/)
- Real-time features powered by [Supabase](https://supabase.com)

---

Made with ❤️ by the TriviaCash team
