import { View } from 'react-native';

export type SwipeableMethods = {
  close: () => void;
  openLeft: () => void;
  openRight: () => void;
  reset: () => void;
};

const ReanimatedSwipeable: typeof View = View;

export default ReanimatedSwipeable;
