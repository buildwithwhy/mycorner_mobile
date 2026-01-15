# Services Layer

This directory contains API service modules that centralize all external API interactions.

## Structure

```
services/
├── index.ts          # Central export point
├── googleMaps.ts     # Google Maps Platform APIs
├── supabase.ts       # Future: Supabase backend (placeholder)
└── README.md         # This file
```

## Google Maps Service (`googleMaps.ts`)

Provides methods for interacting with Google Maps Platform APIs:

### Geocoding
- `geocodeAddress(address)` - Convert address to coordinates
- `reverseGeocode(lat, lng)` - Convert coordinates to address

### Places API
- `getPlacePredictions(input, options)` - Get autocomplete predictions
- `getPlaceDetails(placeId)` - Get detailed place information

### Directions
- `getDirections(origin, destination, mode)` - Get route with duration/distance

### Utilities
- `calculateDistance(lat1, lon1, lat2, lon2)` - Calculate distance between coordinates
  - Note: Also available in `utils/commute.ts` with commute time estimation

## Usage Examples

### Geocoding an Address
```typescript
import { geocodeAddress } from '../services';

const result = await geocodeAddress('10 Downing Street, London');
if (result) {
  console.log('Coordinates:', result.latitude, result.longitude);
  console.log('Formatted:', result.formattedAddress);
}
```

### Getting Directions
```typescript
import { getDirections } from '../services';

const origin = { lat: 51.5074, lng: -0.1278 };
const destination = { lat: 51.5155, lng: -0.0922 };

const route = await getDirections(origin, destination, 'transit');
if (route) {
  console.log('Distance:', route.distance);  // e.g., "5.2 km"
  console.log('Duration:', route.duration);  // e.g., "23 mins"
}
```

### Calculating Distance (No API call)
```typescript
import { calculateDistance } from '../services';

const distance = calculateDistance(51.5074, -0.1278, 51.5155, -0.0922);
console.log(`${distance.toFixed(2)} km`);
```

## Future: Supabase Service

The `supabase.ts` file is a placeholder for future backend integration. When ready to implement:

1. Install Supabase client:
   ```bash
   npm install @supabase/supabase-js
   ```

2. Add environment variables to `.env`:
   ```bash
   SUPABASE_URL=your_project_url
   SUPABASE_ANON_KEY=your_anon_key
   ```

3. Uncomment the configuration in:
   - `config.ts`
   - `app.config.js`
   - `services/supabase.ts`

4. Implement features:
   - User authentication
   - Data synchronization
   - Real-time updates
   - User-generated content

## Best Practices

1. **Error Handling**: All service methods handle errors internally and return `null` on failure
2. **Type Safety**: Use TypeScript interfaces for all service responses
3. **Centralization**: Always use services for API calls instead of direct fetch calls
4. **Environment Variables**: Never hardcode API keys - use config.ts
5. **Logging**: Service errors are logged to console for debugging

## Migration Notes

- **Existing Code**: The app currently uses `utils/commute.ts` for distance calculations
- **No Breaking Changes**: Existing code continues to work; migrate gradually
- **Service Layer**: New features should use the service layer from the start

## API Rate Limits

### Google Maps Platform
- **Free Tier**: $200 credit per month
- **Geocoding**: ~40,000 requests/month free
- **Places**: ~17,000 requests/month free
- **Directions**: ~20,000 requests/month free

Always monitor usage in Google Cloud Console and set quotas to prevent unexpected charges.
