import Animated, {
  type ReanimatedAnimation,
} from '@plextv/react-lightning-plugin-reanimated';
import { Row } from '@plextv/react-native-lightning-components';
import { type FC, useMemo, useState } from 'react';
import Button from '../components/Button';

type AnimatedProps = {
  visible: boolean;
  entering?: ReanimatedAnimation;
  exiting?: ReanimatedAnimation;
};

function randomColor() {
  return `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 1)`;
}

const AnimatedBox: FC<AnimatedProps> = ({ visible, ...props }) => {
  const color = useMemo(() => randomColor(), []);

  return visible ? (
    <Animated.View
      {...props}
      style={{
        width: 75,
        height: 75,
        backgroundColor: color,
        borderRadius: 16,
      }}
    />
  ) : null;
};

export const AnimationSampler: FC<{
  buttonPrefix: string;
  buttonSuffix?: string;
  entering?: ReanimatedAnimation;
  exiting?: ReanimatedAnimation;
}> = ({ buttonPrefix, buttonSuffix = '', entering, exiting }) => {
  const [visible, setVisible] = useState(true);

  return (
    <Row style={{ gap: 15 }}>
      <Button onPress={() => setVisible(!visible)}>
        {buttonPrefix} {visible ? 'Out' : 'In'} {buttonSuffix}
      </Button>

      <AnimatedBox visible={visible} entering={entering} exiting={exiting} />
    </Row>
  );
};
