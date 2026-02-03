// Expo configuration with environment variables support
// Using app.config.js instead of app.json to access process.env
//
// Environment switching:
// - Development: APP_ENV=development npx expo start
// - Staging: APP_ENV=staging npx expo start
// - Production: APP_ENV=production npx expo start (or EAS Build)

const APP_ENV = process.env.APP_ENV || 'development';

// Environment-specific configuration
const envConfig = {
  development: {
    name: "MyCorner (Dev)",
    bundleIdentifier: "com.mycorner.app.dev",
    package: "com.mycorner.app.dev",
  },
  staging: {
    name: "MyCorner (Staging)",
    bundleIdentifier: "com.mycorner.app.staging",
    package: "com.mycorner.app.staging",
  },
  production: {
    name: "MyCorner",
    bundleIdentifier: "com.mycorner.app",
    package: "com.mycorner.app",
  },
};

const currentEnv = envConfig[APP_ENV] || envConfig.development;

module.exports = {
  expo: {
    name: currentEnv.name,
    slug: "mycorner",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    scheme: "mycorner",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#5D8A8A"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: currentEnv.bundleIdentifier,
      buildNumber: "3",
      config: {
        usesNonExemptEncryption: false,
        // iOS uses Apple Maps for display, but needs Google API key for Places/Geocoding
      },
    },
    android: {
      package: currentEnv.package,
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: false,
      predictiveBackGestureEnabled: false,
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY_ANDROID || '',
        },
      },
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "expo-font",
      "expo-splash-screen",
      // Sentry error tracking (enabled when SENTRY_DSN is configured)
      [
        "@sentry/react-native/expo",
        {
          organization: process.env.SENTRY_ORG || "your-org",
          project: process.env.SENTRY_PROJECT || "mycorner",
        }
      ]
    ],
    extra: {
      // Current environment
      appEnv: APP_ENV,

      // Google Maps API keys (separate for iOS and Android)
      googleMapsApiKeyIos: process.env.GOOGLE_MAPS_API_KEY_IOS || '',
      googleMapsApiKeyAndroid: process.env.GOOGLE_MAPS_API_KEY_ANDROID || '',

      // Supabase configuration
      supabaseUrl: process.env.SUPABASE_URL || '',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',

      // Feature flags
      enableDebugLogging: process.env.ENABLE_DEBUG_LOGGING === 'true',
      enableAnalytics: process.env.ENABLE_ANALYTICS === 'true',

      // Sentry error tracking
      sentryDsn: process.env.SENTRY_DSN || '',

      // PostHog analytics
      posthogApiKey: process.env.POSTHOG_API_KEY || '',
      posthogHost: process.env.POSTHOG_HOST || 'https://app.posthog.com',

      // RevenueCat subscriptions
      revenueCatApiKeyIos: process.env.REVENUECAT_API_KEY_IOS || '',
      revenueCatApiKeyAndroid: process.env.REVENUECAT_API_KEY_ANDROID || '',

      // App metadata
      privacyPolicyUrl: 'https://kallidao.com/productlab/mycorner/privacy',
      termsOfServiceUrl: 'https://kallidao.com/productlab/mycorner/terms',

      eas: {
        projectId: '92398f32-690b-423e-84d2-adf0cfbaf860',
      },
    }
  }
};
