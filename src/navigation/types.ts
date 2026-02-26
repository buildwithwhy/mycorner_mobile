import type { Neighborhood } from '../data/neighborhoods';

export type RootStackParamList = {
  Main: undefined;
  Detail: { neighborhood: Neighborhood };
  Destinations: undefined;
  Login: undefined;
  SignUp: undefined;
  Paywall: { source?: string; feature?: string };
  Preferences: undefined;
  Matcher: undefined;
};

export type TabParamList = {
  Home: undefined;
  Map: undefined;
  MyPlaces: undefined;
  Compare: undefined;
  Profile: undefined;
};
