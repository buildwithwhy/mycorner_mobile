# Supabase Setup Guide

This guide will help you complete the Supabase backend setup for MyCorner.

## Prerequisites

- Supabase account created at https://supabase.com
- Project created with credentials already configured in `.env`
- Your project URL: https://rmwmzfdkkqykyhjazmjj.supabase.co

## Step 1: Create Database Schema

1. Open your Supabase project dashboard at https://supabase.com/dashboard/project/rmwmzfdkkqykyhjazmjj
2. Click on the **SQL Editor** icon in the left sidebar
3. Click **New Query** button
4. Copy the entire contents of `supabase-schema.sql` from this project
5. Paste it into the SQL editor
6. Click **Run** to execute the script

This will create:
- 5 database tables (user_favorites, user_comparison, user_neighborhood_status, user_neighborhood_notes, user_destinations)
- Row Level Security (RLS) policies to ensure users can only access their own data
- Indexes for query performance
- Triggers to auto-update timestamps

## Step 2: Configure Email Authentication

Email/password authentication is enabled by default, but you can customize the settings:

1. Go to **Authentication** → **Settings** in your Supabase dashboard
2. Under **Email Auth** section:
   - Ensure **Enable Email Signup** is ON
   - Set **Email Verification** to your preference (recommended: ON for production)
   - Configure email templates if desired

## Step 3: Configure Google OAuth (REQUIRED for "Continue with Google" to work)

To enable Google sign-in:

### Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Select **Application type**: Choose **Web application**
6. Add authorized redirect URIs (add BOTH):
   ```
   https://rmwmzfdkkqykyhjazmjj.supabase.co/auth/v1/callback
   mycorner://auth/callback
   ```
   Note: The first URL is for Supabase, the second is your app's deep link
7. Click **Create** and save your:
   - **Client ID**
   - **Client Secret**

### Configure in Supabase

1. Go to your Supabase dashboard: **Authentication** → **Providers**
2. Find **Google** in the list and click to expand
3. Toggle **Enable Google** to ON
4. Enter your Google **Client ID** and **Client Secret**
5. Click **Save**

### Add Additional OAuth Providers (iOS/Android)

For native mobile app deep linking, you'll need to add additional OAuth client IDs:

1. Return to Google Cloud Console → **Credentials**
2. Create separate OAuth client IDs for:
   - **iOS** (Bundle ID: your iOS bundle identifier)
   - **Android** (Package name: your Android package name + SHA-1 certificate)
3. Add these client IDs to your Supabase Google provider configuration

## Step 4: Configure Deep Linking (Mobile)

The app is configured to use the deep link scheme: `mycorner://`

### For iOS (app.json)

Already configured in `app.json`:
```json
"scheme": "mycorner"
```

### For Android (app.json)

Already configured in `app.json`:
```json
"intentFilters": [
  {
    "action": "VIEW",
    "data": [
      {
        "scheme": "mycorner"
      }
    ],
    "category": ["BROWSABLE", "DEFAULT"]
  }
]
```

## Step 5: Test Authentication

### Test Email/Password Auth

1. Run the app: `npm start`
2. Navigate to the Sign Up screen
3. Create an account with an email and password
4. Check your email for verification (if email verification is enabled)
5. Try signing in with the credentials

### Test Google OAuth

1. Run the app: `npm start`
2. Click **Continue with Google** on Login or Sign Up screen
3. Follow the Google sign-in flow
4. Verify you're redirected back to the app and logged in

## Step 6: Verify Database Access

Once authenticated, verify that data syncing works:

1. Add some neighborhoods to favorites
2. Set statuses on neighborhoods (shortlist, visited, etc.)
3. Add some notes
4. Sign out and sign back in
5. Verify all your data is still there

You can also check the database directly in Supabase:

1. Go to **Table Editor** in Supabase dashboard
2. Check `user_favorites`, `user_neighborhood_status`, `user_neighborhood_notes` tables
3. Verify your user data is being saved correctly

## Troubleshooting

### Authentication Errors

- **"Invalid credentials"**: Check that email/password is correct
- **"Email not confirmed"**: Check your email for verification link
- **Google OAuth fails**: Verify redirect URI is correctly configured in Google Cloud Console and Supabase

### Database Errors

- **"Row Level Security policy violation"**: This likely means RLS policies weren't created correctly. Re-run the schema SQL script.
- **"Table does not exist"**: Schema wasn't created. Run the `supabase-schema.sql` script.

### Deep Linking Issues

- **OAuth redirect doesn't return to app**: Check that the custom URL scheme is properly configured in `app.json`
- Test the deep link manually: `xcrun simctl openurl booted mycorner://auth/callback` (iOS) or `adb shell am start -W -a android.intent.action.VIEW -d "mycorner://auth/callback"` (Android)

## Next Steps

Once authentication is working:

1. Consider implementing data sync service to periodically sync local state to Supabase
2. Add password reset functionality
3. Implement account deletion
4. Add social profile information
5. Consider adding profile photos using Supabase Storage

## Security Best Practices

- ✅ Never commit your `.env` file to version control
- ✅ Use Row Level Security (RLS) policies (already configured)
- ✅ Use the anon key for client-side operations (already configured)
- ✅ Enable email verification for production
- ✅ Regularly review and audit your database policies
- ✅ Use HTTPS for all API calls (handled by Supabase client)

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [React Native Supabase Guide](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)
- [Google OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-google)
