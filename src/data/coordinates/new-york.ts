// Real approximate coordinates for New York neighborhoods
export const newYorkCoordinates: Record<string, { latitude: number; longitude: number }> = {
  // Manhattan
  'ny-1': { latitude: 40.7870, longitude: -73.9754 }, // Upper West Side
  'ny-2': { latitude: 40.7736, longitude: -73.9566 }, // Upper East Side
  'ny-3': { latitude: 40.7336, longitude: -74.0027 }, // Greenwich Village
  'ny-4': { latitude: 40.7233, longitude: -73.9961 }, // SoHo
  'ny-5': { latitude: 40.7163, longitude: -74.0086 }, // Tribeca
  'ny-6': { latitude: 40.7465, longitude: -74.0014 }, // Chelsea
  'ny-7': { latitude: 40.7265, longitude: -73.9815 }, // East Village
  'ny-8': { latitude: 40.7150, longitude: -73.9843 }, // Lower East Side
  'ny-9': { latitude: 40.8116, longitude: -73.9465 }, // Harlem
  'ny-10': { latitude: 40.7638, longitude: -73.9918 }, // Hell's Kitchen
  // Brooklyn
  'ny-11': { latitude: 40.7081, longitude: -73.9571 }, // Williamsburg
  'ny-12': { latitude: 40.7033, longitude: -73.9903 }, // DUMBO
  'ny-13': { latitude: 40.6960, longitude: -73.9936 }, // Brooklyn Heights
  'ny-14': { latitude: 40.6710, longitude: -73.9777 }, // Park Slope
  'ny-15': { latitude: 40.7282, longitude: -73.9514 }, // Greenpoint
  'ny-16': { latitude: 40.6944, longitude: -73.9213 }, // Bushwick
  'ny-17': { latitude: 40.6880, longitude: -73.9962 }, // Cobble Hill
  'ny-18': { latitude: 40.6892, longitude: -73.9771 }, // Fort Greene
  'ny-19': { latitude: 40.6872, longitude: -73.9418 }, // Bedford-Stuyvesant
  'ny-20': { latitude: 40.6694, longitude: -73.9422 }, // Crown Heights
  // Queens
  'ny-21': { latitude: 40.7644, longitude: -73.9235 }, // Astoria
  'ny-22': { latitude: 40.7447, longitude: -73.9485 }, // Long Island City
  'ny-23': { latitude: 40.7580, longitude: -73.8303 }, // Flushing
  'ny-24': { latitude: 40.7557, longitude: -73.8831 }, // Jackson Heights
  'ny-25': { latitude: 40.7196, longitude: -73.8448 }, // Forest Hills
  // Bronx
  'ny-26': { latitude: 40.8176, longitude: -73.9182 }, // South Bronx
  'ny-27': { latitude: 40.9005, longitude: -73.9128 }, // Riverdale
  'ny-28': { latitude: 40.8615, longitude: -73.8854 }, // Fordham
  // Staten Island
  'ny-29': { latitude: 40.6433, longitude: -74.0735 }, // St. George
  'ny-30': { latitude: 40.5075, longitude: -74.2477 }, // Tottenville
};

// Default NYC center coordinates
export const NYC_DEFAULT_COORDS = { latitude: 40.7128, longitude: -74.006 };
