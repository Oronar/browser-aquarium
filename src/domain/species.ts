export type SpeciesId =
  | 'neon-tetra'
  | 'zebra-danio'
  | 'guppy'
  | 'betta'
  | 'angelfish'
  | 'goldfish'
  | 'clownfish'
  | 'catfish';

export type ShapeKey = 'tetra' | 'round' | 'angular' | 'long';

export interface Species {
  id: SpeciesId;
  label: string;
  schooling: boolean;
  shape: ShapeKey;
  bodyLength: number;
  bodyColor: string;
  accentColor: string;
  baseSpeed: number;
  /** [min, max] fraction of tank height (0=top, 1=bottom) this species prefers. */
  verticalBias?: [number, number];
}

export const SPECIES: Record<SpeciesId, Species> = {
  'neon-tetra': {
    id: 'neon-tetra',
    label: 'Neon Tetra',
    schooling: true,
    shape: 'tetra',
    bodyLength: 18,
    bodyColor: '#3fd0ff',
    accentColor: '#ff3b6e',
    baseSpeed: 70,
  },
  'zebra-danio': {
    id: 'zebra-danio',
    label: 'Zebra Danio',
    schooling: true,
    shape: 'long',
    bodyLength: 20,
    bodyColor: '#e8e8e8',
    accentColor: '#1a1a2e',
    baseSpeed: 85,
  },
  guppy: {
    id: 'guppy',
    label: 'Guppy',
    schooling: true,
    shape: 'tetra',
    bodyLength: 16,
    bodyColor: '#ffb703',
    accentColor: '#fb5607',
    baseSpeed: 55,
  },
  betta: {
    id: 'betta',
    label: 'Betta',
    schooling: false,
    shape: 'round',
    bodyLength: 26,
    bodyColor: '#8338ec',
    accentColor: '#ff006e',
    baseSpeed: 40,
  },
  angelfish: {
    id: 'angelfish',
    label: 'Angelfish',
    schooling: false,
    shape: 'angular',
    bodyLength: 34,
    bodyColor: '#c0c0c0',
    accentColor: '#333333',
    baseSpeed: 35,
  },
  goldfish: {
    id: 'goldfish',
    label: 'Goldfish',
    schooling: false,
    shape: 'round',
    bodyLength: 28,
    bodyColor: '#ff8c42',
    accentColor: '#ff6b35',
    baseSpeed: 45,
  },
  clownfish: {
    id: 'clownfish',
    label: 'Clownfish',
    schooling: false,
    shape: 'round',
    bodyLength: 22,
    bodyColor: '#ff6700',
    accentColor: '#ffffff',
    baseSpeed: 50,
  },
  catfish: {
    id: 'catfish',
    label: 'Catfish',
    schooling: false,
    shape: 'long',
    bodyLength: 30,
    bodyColor: '#5c4033',
    accentColor: '#3d2b1f',
    baseSpeed: 30,
    verticalBias: [0.7, 1.0],
  },
};

export const SPECIES_IDS = Object.keys(SPECIES) as SpeciesId[];
