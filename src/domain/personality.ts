export type TraitId = 'bold' | 'skittish' | 'lazy' | 'curious' | 'graceful';

export interface SteeringParams {
  baseSpeedMult: number;
  turnIntervalMs: [number, number];
  wanderStrength: number;
  restProbability: number;
  edgeAvoidMargin: number;
}

export interface PersonalityTrait {
  id: TraitId;
  label: string;
  description: string;
  steering: SteeringParams;
  hungerDecayMult: number;
  happinessBaselineOffset: number;
}

export const TRAITS: Record<TraitId, PersonalityTrait> = {
  bold: {
    id: 'bold',
    label: 'Bold',
    description: 'Fast, holds heading long, glides confidently near the glass.',
    steering: {
      baseSpeedMult: 1.2,
      turnIntervalMs: [2000, 4000],
      wanderStrength: 0.3,
      restProbability: 0.05,
      edgeAvoidMargin: 20,
    },
    hungerDecayMult: 1.1,
    happinessBaselineOffset: 5,
  },
  skittish: {
    id: 'skittish',
    label: 'Skittish',
    description: 'Frequent erratic turns, dashes away when other fish get close.',
    steering: {
      baseSpeedMult: 0.9,
      turnIntervalMs: [400, 1200],
      wanderStrength: 0.9,
      restProbability: 0.05,
      edgeAvoidMargin: 60,
    },
    hungerDecayMult: 1.15,
    happinessBaselineOffset: -5,
  },
  lazy: {
    id: 'lazy',
    label: 'Lazy',
    description: 'Slow, frequently idle-hovers instead of swimming.',
    steering: {
      baseSpeedMult: 0.6,
      turnIntervalMs: [3000, 6000],
      wanderStrength: 0.4,
      restProbability: 0.5,
      edgeAvoidMargin: 30,
    },
    hungerDecayMult: 0.85,
    happinessBaselineOffset: 0,
  },
  curious: {
    id: 'curious',
    label: 'Curious',
    description: 'Periodically approaches and lingers near a point of interest.',
    steering: {
      baseSpeedMult: 1.0,
      turnIntervalMs: [1500, 3000],
      wanderStrength: 0.6,
      restProbability: 0.1,
      edgeAvoidMargin: 25,
    },
    hungerDecayMult: 1.0,
    happinessBaselineOffset: 5,
  },
  graceful: {
    id: 'graceful',
    label: 'Graceful',
    description: 'Wide smooth curved paths, steady speed, minimal variance.',
    steering: {
      baseSpeedMult: 1.0,
      turnIntervalMs: [2500, 5000],
      wanderStrength: 0.2,
      restProbability: 0.1,
      edgeAvoidMargin: 25,
    },
    hungerDecayMult: 0.95,
    happinessBaselineOffset: 3,
  },
};

export const TRAIT_IDS = Object.keys(TRAITS) as TraitId[];
