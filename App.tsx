import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { AppProvider } from './src/contexts/AppContext';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

// Suppress VirtualizedLists warning for GooglePlacesAutocomplete
// This is a known issue when using GooglePlacesAutocomplete inside a ScrollView
LogBox.ignoreLogs(['VirtualizedLists should never be nested']);

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppNavigator />
        <StatusBar style="light" />
      </AppProvider>
    </AuthProvider>
  );
}
