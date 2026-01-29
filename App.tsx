import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from './src/contexts/AppContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';
import { PreferencesProvider } from './src/contexts/PreferencesContext';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import OfflineBanner from './src/components/OfflineBanner';
import { initSentry, wrap } from './src/services/sentry';
import { initAnalytics } from './src/services/analytics';
import { logConfig } from './config';
import logger from './src/utils/logger';

// Suppress VirtualizedLists warning for GooglePlacesAutocomplete
// This is a known issue when using GooglePlacesAutocomplete inside a ScrollView
LogBox.ignoreLogs(['VirtualizedLists should never be nested']);

// Initialize Sentry as early as possible
initSentry();

function App() {
  useEffect(() => {
    // Log environment info on app start
    logger.logEnvInfo();
    logConfig();

    // Initialize analytics
    initAnalytics();
  }, []);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AuthProvider>
          <SubscriptionProvider>
            <PreferencesProvider>
              <AppProvider>
                <OfflineBanner />
                <AppNavigator />
                <StatusBar style="light" />
              </AppProvider>
            </PreferencesProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

// Wrap with Sentry for performance monitoring
export default wrap(App);
