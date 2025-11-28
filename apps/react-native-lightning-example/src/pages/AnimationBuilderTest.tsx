import { Button } from '@plextv/react-native-lightning';
import { Column, Row } from '@plextv/react-native-lightning-components';
import { type FC, useMemo, useState } from 'react';
import Animated, {
  type EntryOrExitLayoutType,
  FadeIn as FadeInBuilder,
  FadeInDown as FadeInDownBuilder,
  FadeInLeft as FadeInLeftBuilder,
  FadeInRight as FadeInRightBuilder,
  FadeInUp as FadeInUpBuilder,
  FadeOut as FadeOutBuilder,
  FadeOutDown as FadeOutDownBuilder,
  FadeOutLeft as FadeOutLeftBuilder,
  FadeOutRight as FadeOutRightBuilder,
  FadeOutUp as FadeOutUpBuilder,
  SlideInDown as SlideInDownBuilder,
  SlideInLeft as SlideInLeftBuilder,
  SlideInRight as SlideInRightBuilder,
  SlideInUp as SlideInUpBuilder,
  SlideOutDown as SlideOutDownBuilder,
  SlideOutLeft as SlideOutLeftBuilder,
  SlideOutRight as SlideOutRightBuilder,
  SlideOutUp as SlideOutUpBuilder,
} from 'react-native-reanimated';

type AnimatedProps = {
  visible: boolean;
  entering?: EntryOrExitLayoutType;
  exiting?: EntryOrExitLayoutType;
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

const AnimationExample: FC<{
  buttonPrefix: string;
  buttonSuffix?: string;
  entering?: EntryOrExitLayoutType;
  exiting?: EntryOrExitLayoutType;
}> = ({ buttonPrefix, buttonSuffix = '', entering, exiting }) => {
  const [visible, setVisible] = useState(true);

  return (
    <Row style={{ gap: 25 }}>
      <Button
        title={`${buttonPrefix} ${visible ? 'Out' : 'In'} ${buttonSuffix}`}
        color="rgba(46, 43, 0, 1)"
        onPress={() => setVisible(!visible)}
        style={{
          width: 150,
          height: 75,
          borderRadius: 16,
        }}
      ></Button>
      <AnimatedBox visible={visible} entering={entering} exiting={exiting} />
    </Row>
  );
};

const AnimationBuilderTest: FC = () => {
  return (
    <Row style={{ gap: 25 }}>
      <Column style={{ gap: 15 }}>
        <AnimationExample
          buttonPrefix="Fade"
          entering={FadeInBuilder.duration(1000)}
          exiting={FadeOutBuilder.duration(1000)}
        />

        <AnimationExample
          buttonPrefix="Fade"
          buttonSuffix="Up"
          entering={FadeInUpBuilder.duration(1000)}
          exiting={FadeOutUpBuilder.duration(1000)}
        />

        <AnimationExample
          buttonPrefix="Fade"
          buttonSuffix="Right"
          entering={FadeInRightBuilder.duration(1000)}
          exiting={FadeOutRightBuilder.duration(1000)}
        />

        <AnimationExample
          buttonPrefix="Fade"
          buttonSuffix="Down"
          entering={FadeInDownBuilder.duration(1000)}
          exiting={FadeOutDownBuilder.duration(1000)}
        />

        <AnimationExample
          buttonPrefix="Fade"
          buttonSuffix="Left"
          entering={FadeInLeftBuilder.duration(1000)}
          exiting={FadeOutLeftBuilder.duration(1000)}
        />
      </Column>

      <Column style={{ gap: 15 }}>
        <AnimationExample
          buttonPrefix="Slide"
          buttonSuffix="Up"
          entering={SlideInUpBuilder.duration(1000)}
          exiting={SlideOutUpBuilder.duration(1000)}
        />

        <AnimationExample
          buttonPrefix="Slide"
          buttonSuffix="Right"
          entering={SlideInRightBuilder.duration(1000)}
          exiting={SlideOutRightBuilder.duration(1000)}
        />

        <AnimationExample
          buttonPrefix="Slide"
          buttonSuffix="Down"
          entering={SlideInDownBuilder.duration(1000)}
          exiting={SlideOutDownBuilder.duration(1000)}
        />

        <AnimationExample
          buttonPrefix="Slide"
          buttonSuffix="Left"
          entering={SlideInLeftBuilder.duration(1000)}
          exiting={SlideOutLeftBuilder.duration(1000)}
        />
      </Column>
    </Row>
  );
};

export { AnimationBuilderTest };
