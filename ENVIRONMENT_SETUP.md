# Environment Variables Setup

This guide explains how to configure environment variables for the MyCorner app.

## Quick Start

1. **Copy the example file**
   ```bash
   cp .env.example .env
   ```

2. **Get a Google Maps API Key**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the following APIs:
     - Places API
     - Geocoding API
     - Maps SDK for iOS
     - Maps SDK for Android
   - Create credentials → API Key
   - Copy your API key

3. **Update your .env file**
   ```bash
   GOOGLE_MAPS_API_KEY=your_actual_api_key_here
   ```

4. **Restart the Expo dev server**
   ```bash
   npx expo start --clear
   ```

## Important Notes

- **Never commit `.env` to version control** - it's already in `.gitignore`
- **Always restart the dev server** after changing environment variables
- **The `.env.example` file** should be committed as a template for other developers

## How It Works

1. Environment variables are defined in `.env` file
2. `app.config.js` reads from `process.env` at build time
3. Values are exposed via `expo-constants` in the `extra` field
4. `config.ts` imports from `expo-constants` to access the values

## Production Deployment

For production builds (EAS Build, etc.), set environment variables in your build service:

```bash
# Example with EAS Build
eas secret:create --scope project --name GOOGLE_MAPS_API_KEY --value your_key
```

## Security Best Practices

1. **Restrict your API key** in Google Cloud Console:
   - Set application restrictions (iOS/Android bundle IDs)
   - Set API restrictions (only enable required APIs)
   - Set quotas to prevent abuse

2. **Use different keys for development and production**

3. **Monitor usage** in Google Cloud Console to detect any unusual activity

## Future: Supabase Setup

When ready to add Supabase:

1. Add to `.env`:
   ```bash
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

2. Uncomment the Supabase lines in:
   - `.env.example`
   - `app.config.js`
   - `config.ts`

3. Restart dev server

## Troubleshooting

**Problem:** Getting "YOUR_GOOGLE_MAPS_API_KEY" in the app

**Solution:**
1. Make sure you created `.env` from `.env.example`
2. Make sure you added your actual API key to `.env`
3. Restart the dev server with `npx expo start --clear`

**Problem:** Places autocomplete not working

**Solution:**
1. Verify the API key is correct
2. Check that Places API is enabled in Google Cloud Console
3. Check the API key restrictions aren't blocking requests
4. Look for error messages in the console
