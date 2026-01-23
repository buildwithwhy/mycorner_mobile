export interface City {
  id: string;
  name: string;
  country: string;
  flag: string;
  region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  areaLabel: string;
}

export const cities: City[] = [
  {
    id: 'london',
    name: 'London',
    country: 'UK',
    flag: '\u{1F1EC}\u{1F1E7}',
    region: {
      latitude: 51.5074,
      longitude: -0.1278,
      latitudeDelta: 0.3,
      longitudeDelta: 0.3,
    },
    areaLabel: 'Borough',
  },
  {
    id: 'new-york',
    name: 'New York',
    country: 'USA',
    flag: '\u{1F1FA}\u{1F1F8}',
    region: {
      latitude: 40.7128,
      longitude: -74.006,
      latitudeDelta: 0.3,
      longitudeDelta: 0.3,
    },
    areaLabel: 'Borough',
  },
];

export const getCityById = (id: string): City | undefined => {
  return cities.find((city) => city.id === id);
};

export const DEFAULT_CITY_ID = 'london';
