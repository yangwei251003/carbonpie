import type { BehaviorType } from '@/features/log/types';

export type BehaviorCatalogItem = {
  type: BehaviorType;
  icon: string;
};

export const ORDERED_BEHAVIORS: BehaviorCatalogItem[] = [
  { type: 'transport_bus', icon: 'bus' },
  { type: 'transport_metro', icon: 'train' },
  { type: 'bike', icon: 'bicycle' },
  { type: 'walk', icon: 'walk' },
  { type: 'food_save', icon: 'food-apple' },
  { type: 'standby_off', icon: 'power-plug-off' },
  { type: 'ac_habit', icon: 'air-conditioner' },
  { type: 'mug', icon: 'cup' },
  { type: 'virtue', icon: 'hand-heart' },
];
