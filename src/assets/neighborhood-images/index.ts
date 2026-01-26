// Auto-generated neighborhood image mappings
// Maps neighborhood ID to the bundled image asset

import { ImageSourcePropType } from 'react-native';

// London neighborhoods
const shoreditch = require('./shoreditch.png');
const clapham = require('./clapham.png');
const brixton = require('./brixton.png');
const camden = require('./camden.png');
const greenwich = require('./greenwich.png');
const nottingHill = require('./notting-hill.png');
const hackneyWick = require('./hackney-wick.png');
const richmond = require('./richmond.png');
const peckham = require('./peckham.png');
const wimbledon = require('./wimbledon.png');
const dalston = require('./dalston.png');
const canaryWharf = require('./canary-wharf.png');
const dulwich = require('./dulwich.png');
const stratford = require('./stratford.png');
const islington = require('./islington.png');
const wandsworth = require('./wandsworth.png');
const hampstead = require('./hampstead.png');
const bethnalGreen = require('./bethnal-green.png');
const battersea = require('./battersea.png');
const crouchEnd = require('./crouch-end.png');
const bermondsey = require('./bermondsey.png');
const ealing = require('./ealing.png');
const putney = require('./putney.png');
const kentishTown = require('./kentish-town.png');
const balham = require('./balham.png');
const hackneyCentral = require('./hackney-central.png');
const fulham = require('./fulham.png');
const walthamstow = require('./walthamstow.png');
const kensington = require('./kensington.png');
const tooting = require('./tooting.png');
const angel = require('./angel.png');
const chiswick = require('./chiswick.png');
const deptford = require('./deptford.png');
const stJohnsWood = require('./st-johns-wood.png');
const stokeNewington = require('./stoke-newington.png');
const forestHill = require('./forest-hill.png');
const claphamNorth = require('./clapham-north.png');
const elephantAndCastle = require('./elephant-and-castle.png');
const marylebone = require('./marylebone.png');
const crystalPalace = require('./crystal-palace.png');

// New York neighborhoods
const upperWestSide = require('./upper-west-side.png');
const upperEastSide = require('./upper-east-side.png');
const greenwichVillage = require('./greenwich-village.png');
const soho = require('./soho.png');
const tribeca = require('./tribeca.png');
const chelsea = require('./chelsea.png');
const eastVillage = require('./east-village.png');
const lowerEastSide = require('./lower-east-side.png');
const harlem = require('./harlem.png');
const hellsKitchen = require('./hells-kitchen.png');
const williamsburg = require('./williamsburg.png');
const dumbo = require('./dumbo.png');
const brooklynHeights = require('./brooklyn-heights.png');
const parkSlope = require('./park-slope.png');
const greenpoint = require('./greenpoint.png');
const bushwick = require('./bushwick.png');
const cobbleHill = require('./cobble-hill.png');
const fortGreene = require('./fort-greene.png');
const bedfordStuyvesant = require('./bedford-stuyvesant.png');
const crownHeights = require('./crown-heights.png');
const astoria = require('./astoria.png');
const longIslandCity = require('./long-island-city.png');
const flushing = require('./flushing.png');
const jacksonHeights = require('./jackson-heights.png');
const forestHills = require('./forest-hills.png');
const southBronx = require('./south-bronx.png');
const riverdale = require('./riverdale.png');
const fordham = require('./fordham.png');
const stGeorge = require('./st-george.png');
const tottenville = require('./tottenville.png');

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
