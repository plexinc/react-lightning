import { type FlatListProps, FlatList as RNFlatList } from 'react-native';
import {
  type AnimatedComponent,
  createAnimatedComponent,
} from './createAnimatedComponent';

export const FlatList: AnimatedComponent<FlatListProps<unknown>> =
  createAnimatedComponent(RNFlatList);
