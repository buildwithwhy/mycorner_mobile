// Expo configuration with environment variables support
// Using app.config.js instead of app.json to access process.env

module.exports = {
  expo: {
    name: "MyCorner",
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
      backgroundColor: "#10b981"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.mycorner.app"
    },
    android: {
      package: "com.mycorner.app",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "expo-font"
    ],
    extra: {
      // Environment variables exposed to the app via expo-constants
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY',
      // Supabase configuration
      supabaseUrl: process.env.SUPABASE_URL || '',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
      // App metadata
      privacyPolicyUrl: 'https://kallidao.com/productlab/mycorner/privacy',
      eas: {
        projectId: process.env.EAS_PROJECT_ID || '',
      },
    }
  }
};
