import React, { Suspense, lazy } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MyPlacesScreen from '../screens/MyPlacesScreen';
import CompareScreen from '../screens/CompareScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import PaywallScreen from '../screens/PaywallScreen';
import PreferencesScreen from '../screens/PreferencesScreen';
import MatcherScreen from '../screens/MatcherScreen';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../constants/theme';

// Lazy load heavy screens to reduce initial bundle parse time
const MapScreen = lazy(() => import('../screens/MapScreen'));
const DetailScreen = lazy(() => import('../screens/DetailScreen'));
const DestinationsScreen = lazy(() => import('../screens/DestinationsScreen'));

// Loading fallback component
function ScreenLoader() {
  return (
    <View style={styles.loader}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}

// Wrapper for lazy-loaded screens
function LazyMapScreen() {
  return (
    <Suspense fallback={<ScreenLoader />}>
      <MapScreen />
    </Suspense>
  );
}

function LazyDetailScreen() {
  return (
    <Suspense fallback={<ScreenLoader />}>
      <DetailScreen />
    </Suspense>
  );
}

function LazyDestinationsScreen() {
  return (
    <Suspense fallback={<ScreenLoader />}>
      <DestinationsScreen />
    </Suspense>
  );
}

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function ProfileTabScreen() {
  const { session } = useAuth();
  return session ? <ProfileScreen /> : <LoginScreen />;
}

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Map') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'MyPlaces') {
            iconName = focused ? 'bookmark' : 'bookmark-outline';
          } else if (route.name === 'Compare') {
            iconName = focused ? 'git-compare' : 'git-compare-outline';
          } else {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray400,
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Map" component={LazyMapScreen} />
      <Tab.Screen name="MyPlaces" component={MyPlacesScreen} options={{ title: 'My Places' }} />
      <Tab.Screen name="Compare" component={CompareScreen} />
      <Tab.Screen name="Profile" component={ProfileTabScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.gray50 }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={TabNavigator} />
        <Stack.Screen name="Detail" component={LazyDetailScreen} />
        <Stack.Screen name="Destinations" component={LazyDestinationsScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen
          name="Paywall"
          component={PaywallScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen name="Preferences" component={PreferencesScreen} />
        <Stack.Screen name="Matcher" component={MatcherScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
  },
});
