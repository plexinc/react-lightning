import {
  makeMutable as makeMutableOriginal,
  useSharedValue as useSharedValueOriginal,
} from 'react-native-reanimated-original';

import { instrumentSharedValue } from '../utils/sharedValueTracking';

// Wrapped so reads are trackable (see sharedValueTracking); behavior of the
// value itself is untouched.
export const useSharedValue: typeof useSharedValueOriginal = (initialValue) =>
  instrumentSharedValue(useSharedValueOriginal(initialValue));

export const makeMutable: typeof makeMutableOriginal = (initialValue) =>
  instrumentSharedValue(makeMutableOriginal(initialValue));
