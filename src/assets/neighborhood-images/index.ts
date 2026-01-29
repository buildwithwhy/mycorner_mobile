// Auto-generated neighborhood image mappings
// Maps neighborhood ID to the bundled image asset

import { ImageSourcePropType } from 'react-native';

// London neighborhoods
const shoreditch = require('./shoreditch.webp');
const clapham = require('./clapham.webp');
const brixton = require('./brixton.webp');
const camden = require('./camden.webp');
const greenwich = require('./greenwich.webp');
const nottingHill = require('./notting-hill.webp');
const hackneyWick = require('./hackney-wick.webp');
const richmond = require('./richmond.webp');
const peckham = require('./peckham.webp');
const wimbledon = require('./wimbledon.webp');
const dalston = require('./dalston.webp');
const canaryWharf = require('./canary-wharf.webp');
const dulwich = require('./dulwich.webp');
const stratford = require('./stratford.webp');
const islington = require('./islington.webp');
const wandsworth = require('./wandsworth.webp');
const hampstead = require('./hampstead.webp');
const bethnalGreen = require('./bethnal-green.webp');
const battersea = require('./battersea.webp');
const crouchEnd = require('./crouch-end.webp');
const bermondsey = require('./bermondsey.webp');
const ealing = require('./ealing.webp');
const putney = require('./putney.webp');
const kentishTown = require('./kentish-town.webp');
const balham = require('./balham.webp');
const hackneyCentral = require('./hackney-central.webp');
const fulham = require('./fulham.webp');
const walthamstow = require('./walthamstow.webp');
const kensington = require('./kensington.webp');
const tooting = require('./tooting.webp');
const angel = require('./angel.webp');
const chiswick = require('./chiswick.webp');
const deptford = require('./deptford.webp');
const stJohnsWood = require('./st-johns-wood.webp');
const stokeNewington = require('./stoke-newington.webp');
const forestHill = require('./forest-hill.webp');
const claphamNorth = require('./clapham-north.webp');
const elephantAndCastle = require('./elephant-and-castle.webp');
const marylebone = require('./marylebone.webp');
const crystalPalace = require('./crystal-palace.webp');

// New York neighborhoods
const upperWestSide = require('./upper-west-side.webp');
const upperEastSide = require('./upper-east-side.webp');
const greenwichVillage = require('./greenwich-village.webp');
const soho = require('./soho.webp');
const tribeca = require('./tribeca.webp');
const chelsea = require('./chelsea.webp');
const eastVillage = require('./east-village.webp');
const lowerEastSide = require('./lower-east-side.webp');
const harlem = require('./harlem.webp');
const hellsKitchen = require('./hells-kitchen.webp');
const williamsburg = require('./williamsburg.webp');
const dumbo = require('./dumbo.webp');
const brooklynHeights = require('./brooklyn-heights.webp');
const parkSlope = require('./park-slope.webp');
const greenpoint = require('./greenpoint.webp');
const bushwick = require('./bushwick.webp');
const cobbleHill = require('./cobble-hill.webp');
const fortGreene = require('./fort-greene.webp');
const bedfordStuyvesant = require('./bedford-stuyvesant.webp');
const crownHeights = require('./crown-heights.webp');
const astoria = require('./astoria.webp');
const longIslandCity = require('./long-island-city.webp');
const flushing = require('./flushing.webp');
const jacksonHeights = require('./jackson-heights.webp');
const forestHills = require('./forest-hills.webp');
const southBronx = require('./south-bronx.webp');
const riverdale = require('./riverdale.webp');
const fordham = require('./fordham.webp');
const stGeorge = require('./st-george.webp');
const tottenville = require('./tottenville.webp');

// Map neighborhood ID to image
export const neighborhoodImages: Record<string, ImageSourcePropType> = {
  // London (IDs 1-40)
  '1': shoreditch,
  '2': clapham,
  '3': brixton,
  '4': camden,
  '5': greenwich,
  '6': nottingHill,
  '7': hackneyWick,
  '8': richmond,
  '9': peckham,
  '10': wimbledon,
  '11': dalston,
  '12': canaryWharf,
  '13': dulwich,
  '14': stratford,
  '15': islington,
  '16': wandsworth,
  '17': hampstead,
  '18': bethnalGreen,
  '19': battersea,
  '20': crouchEnd,
  '21': bermondsey,
  '22': ealing,
  '23': putney,
  '24': kentishTown,
  '25': balham,
  '26': hackneyCentral,
  '27': fulham,
  '28': walthamstow,
  '29': kensington,
  '30': tooting,
  '31': angel,
  '32': chiswick,
  '33': deptford,
  '34': stJohnsWood,
  '35': stokeNewington,
  '36': forestHill,
  '37': claphamNorth,
  '38': elephantAndCastle,
  '39': marylebone,
  '40': crystalPalace,
  // New York (IDs ny-1 to ny-30)
  'ny-1': upperWestSide,
  'ny-2': upperEastSide,
  'ny-3': greenwichVillage,
  'ny-4': soho,
  'ny-5': tribeca,
  'ny-6': chelsea,
  'ny-7': eastVillage,
  'ny-8': lowerEastSide,
  'ny-9': harlem,
  'ny-10': hellsKitchen,
  'ny-11': williamsburg,
  'ny-12': dumbo,
  'ny-13': brooklynHeights,
  'ny-14': parkSlope,
  'ny-15': greenpoint,
  'ny-16': bushwick,
  'ny-17': cobbleHill,
  'ny-18': fortGreene,
  'ny-19': bedfordStuyvesant,
  'ny-20': crownHeights,
  'ny-21': astoria,
  'ny-22': longIslandCity,
  'ny-23': flushing,
  'ny-24': jacksonHeights,
  'ny-25': forestHills,
  'ny-26': southBronx,
  'ny-27': riverdale,
  'ny-28': fordham,
  'ny-29': stGeorge,
  'ny-30': tottenville,
};

export const getNeighborhoodImage = (id: string): ImageSourcePropType | undefined => {
  return neighborhoodImages[id];
};
