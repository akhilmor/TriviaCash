# Supabase Multiplayer Setup Guide

This guide will help you set up Supabase for the TriviaCash multiplayer functionality.

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. A new Supabase project

## Step 1: Create Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Fill in your project details:
   - Name: `trivia-cash` (or your preferred name)
   - Database Password: (choose a strong password)
   - Region: (choose closest to your users)
4. Wait for the project to be created (takes ~2 minutes)

## Step 2: Set Up Database Schema

1. In your Supabase project dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `database/schema.sql`
4. Paste it into the SQL editor
5. Click **Run** (or press Ctrl/Cmd + Enter)
6. You should see "Success. No rows returned"

## Step 3: Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. You'll need:
   - **Project URL**: Found under "Project URL"
   - **anon/public key**: Found under "Project API keys" → "anon public"

## Step 4: Configure Environment Variables

### Option A: Using .env file (Recommended for development)

1. Create a `.env` file in the root of your project (if it doesn't exist)
2. Add the following:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_project_url_here
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```
3. Replace the values with your actual Supabase credentials

### Option B: Using app.json

1. Open `app.json`
2. Add environment variables in the `expo.extra` section:
   ```json
   {
     "expo": {
       "extra": {
         "supabaseUrl": "your_project_url_here",
         "supabaseAnonKey": "your_anon_key_here"
       }
     }
   }
   ```

## Step 5: Install Dependencies

Run the following command to install the required packages:

```bash
npm install
```

This will install:
- `@supabase/supabase-js`
- `react-native-url-polyfill`

## Step 6: Verify Setup

1. Start your Expo app:
   ```bash
   npm start
   ```

2. Navigate to a game and try matchmaking
3. Check the Supabase dashboard:
   - Go to **Table Editor** → **rooms** to see created rooms
   - Go to **Table Editor** → **room_events** to see answer events

## Troubleshooting

### "Supabase URL or Anon Key not found" warning

- Make sure your `.env` file is in the root directory
- Ensure environment variable names match exactly: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Restart your Expo development server after adding environment variables

### Realtime not working

1. In Supabase dashboard, go to **Database** → **Replication**
2. Ensure both `rooms` and `room_events` tables have replication enabled
3. If using Row Level Security (RLS), ensure policies allow realtime subscriptions

### Connection errors

- Verify your Supabase project URL is correct
- Check that your anon key is correct (not the service_role key)
- Ensure your Supabase project is active and not paused

## Security Notes

- The `anon` key is safe to expose in client-side code
- Never commit your `.env` file to version control
- Row Level Security (RLS) is enabled but currently allows all operations for ease of development
- For production, you should add proper RLS policies based on your authentication requirements

## Next Steps

After setup is complete, the app will:
1. Create rooms when players join matchmaking
2. Match players automatically
3. Track answers in real-time via Supabase Realtime
4. Calculate winners and update room status

Enjoy multiplayer trivia! 🎮

