# Google Maps API Setup Guide

To enable address autocomplete and accurate location coordinates for destinations, you need to set up a Google Maps API key.

## Step 1: Get a Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Enable billing for your project (required for Maps APIs)
4. Enable the following APIs:
   - **Places API** (for address autocomplete)
   - **Geocoding API** (for converting addresses to coordinates)
   - **Maps SDK for iOS** (if deploying to iOS)
   - **Maps SDK for Android** (if deploying to Android)

5. Create an API key:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy your new API key

## Step 2: Secure Your API Key (Important!)

⚠️ **Before using the key in production:**

1. Click "Restrict Key" in the credentials page
2. Under "Application restrictions":
   - For iOS: Choose "iOS apps" and add your bundle identifier
   - For Android: Choose "Android apps" and add your package name + SHA-1 certificate fingerprint
3. Under "API restrictions":
   - Choose "Restrict key"
   - Select only the APIs you need (Places API, Geocoding API, Maps SDK)

## Step 3: Add Key to Your App

1. Open `config.ts` in the project root
2. Replace `'YOUR_GOOGLE_MAPS_API_KEY'` with your actual API key:

```typescript
export const GOOGLE_MAPS_API_KEY = 'AIzaSyC...your-actual-key-here';
```

## Step 4: Test the Feature

1. Restart your Expo development server
2. Open the app and try adding a destination
3. You should now see address suggestions as you type

## Pricing

- Google Maps Platform has a **free tier** with $200 monthly credit
- Places Autocomplete costs: **$2.83 per 1000 requests** (after free tier)
- Geocoding costs: **$5.00 per 1000 requests** (after free tier)
- Most personal/small projects stay within the free tier

## Alternative: Use Without API Key

If you don't want to set up Google Maps right now, you can:
- Manually enter coordinates for destinations
- Use a different geocoding service
- Skip the destinations feature temporarily

The app will show a warning but still function without the API key.

## Troubleshooting

**"This API project is not authorized to use this API"**
- Make sure you've enabled the Places API in your Google Cloud project

**"REQUEST_DENIED" error**
- Check that your API key restrictions allow the app to use it
- Verify billing is enabled on your Google Cloud project

**No suggestions appearing**
- Check your internet connection
- Verify the API key is correctly pasted in config.ts
- Check the Google Cloud Console for API request logs/errors
