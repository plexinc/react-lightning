import type {
  EffectsMap,
  LightningViewElementStyle,
} from '@plextv/react-lightning';
import { Column, Row } from '@plextv/react-lightning-components';
import { useCallback, useMemo, useState } from 'react';
import Button from '../components/Button';

function randomColour(): number {
  return Number.parseInt(
    `${Math.round(Math.random() * 0xffffff).toString(16)}ff`,
    16,
  );
}

const img =
  'https://images.plex.tv/photo?size=large-720&scale=2&url=https://image.tmdb.org/t/p/original/65firYWt2FoK18KuYxnmHmVaEsL.jpg';
const img2 =
  'https://images.plex.tv/photo?size=large-1280&scale=1&url=https://image.tmdb.org/t/p/original/4WctqRtusYpTLHNkuVjQe4R51DZ.jpg';

const RadiiExample = ({
  colors,
  style,
}: {
  colors: number[];
  style: LightningViewElementStyle;
}) => {
  const colorTL = colors[0] ?? 0xff0000ff;
  const colorTR = colors[1] ?? colorTL;
  const colorBR = colors[2] ?? colorTL;
  const colorBL = colors[3] ?? colorTR;
  const effects = useMemo(
    () =>
      ({
        noise: {
          type: 'Noise',
          props: {
            frequency: 0.1,
            amplitude: 0.1,
          },
        },
        colorTL: {
          type: 'SimpleRadial',
          props: {
            color: colorTL,
            width: (style?.width ?? 1920) * 0.7,
            pivot: [0, 0],
          },
        },
        colorTR: {
          type: 'SimpleRadial',
          props: {
            color: colorTR,
            width: (style?.width ?? 1920) * 0.7,
            pivot: [1, 0],
          },
        },
        colorBR: {
          type: 'SimpleRadial',
          props: {
            color: colorBR,
            width: (style?.width ?? 1920) * 0.7,
            pivot: [1, 1],
          },
        },
        colorBL: {
          type: 'SimpleRadial',
          props: {
            color: colorBL,
            width: (style?.width ?? 1920) * 0.7,
            pivot: [0, 1],
          },
        },
      }) as EffectsMap,
    [colorTL, colorTR, colorBR, colorBL, style],
  );
  return (
    <lng-view
      effects={effects}
      transition={{
        noise: { duration: 1000 },
        colorTL: { duration: 1000 },
        colorTR: { duration: 1000 },
        colorBR: { duration: 1000 },
        colorBL: { duration: 1000 },
      }}
      style={style}
    />
  );
};
const FadeExample = ({
  image,
  style,
}: {
  image: string;
  style: LightningViewElementStyle;
}) => {
  const effects = useMemo(
    () =>
      ({
        fade: {
          type: 'fadeOut',
          props: {
            fade: [100, 200, 300, 300],
          },
        },
      }) as EffectsMap,
    [],
  );
  return <lng-image effects={effects} src={image} style={style} />;
};

export const EffectsPage = () => {
  const [colors, setColors] = useState([
    0xff0000ff, 0x00ff00ff, 0x0000ffff, 0xff00ffff,
  ]);
  const [showImage, setShowImage] = useState(true);
  const [image, setImage] = useState(img);

  const randomizeColours = useCallback(() => {
    const newColors = [
      randomColour(),
      randomColour(),
      randomColour(),
      randomColour(),
    ];
    setColors(newColors);
  }, []);
  const toggleImage = useCallback(() => {
    setShowImage(!showImage);
  }, [showImage]);
  const switchImage = useCallback(() => {
    setImage(image === img ? img2 : img);
  }, [image]);

  return (
    <>
      <RadiiExample
        colors={colors}
        style={{ width: 1920, height: 1080, zIndex: 1 }}
      />
      <FadeExample
        image={image}
        style={{
          width: 1280,
          position: 'absolute',
          top: 0,
          left: 1920,
          mountX: 1,
          zIndex: 2,
          display: showImage ? 'flex' : 'none',
        }}
      />
      <Column
        focusable
        style={{
          gap: 20,
          zIndex: 10,
          position: 'absolute',
          top: 0,
          left: 0,
          width: 1920,
          height: 1080,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Row>
          <Button onPress={randomizeColours}>Randomize Colors</Button>
          <Button onPress={toggleImage}>Toggle Image</Button>
          <Button onPress={switchImage}>Switch Image</Button>
        </Row>
        <Row>
          <lng-view style={{ width: 50, height: 50, color: colors[0] }} />
          <lng-view style={{ width: 50, height: 50, color: colors[1] }} />
          <lng-view style={{ width: 50, height: 50, color: colors[2] }} />
          <lng-view style={{ width: 50, height: 50, color: colors[3] }} />
        </Row>
      </Column>
    </>
  );
};
