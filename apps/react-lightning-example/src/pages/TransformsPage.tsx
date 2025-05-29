import { Column, Row } from '@plextv/react-lightning-components';
import { useCallback, useState } from 'react';
import Button from '../components/Button';

const img =
  'https://images.plex.tv/photo?size=large-720&scale=2&url=https://image.tmdb.org/t/p/original/65firYWt2FoK18KuYxnmHmVaEsL.jpg';

export const TransformsPage = () => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  const scaleUp = useCallback(() => {
    setScale((state) => state * 1.25);
  }, []);
  const scaleDown = useCallback(() => {
    setScale((state) => state * 0.8);
  }, []);
  const rotateLeft = useCallback(() => {
    setRotation((state) => state + 15);
  }, []);
  const rotateRight = useCallback(() => {
    setRotation((state) => state - 15);
  }, []);

  return (
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
        <Button onPress={scaleUp}>Scale Up</Button>
        <Button onPress={scaleDown}>Scale Down</Button>
        <Button onPress={rotateLeft}>Rotate Left</Button>
        <Button onPress={rotateRight}>Rotate Right</Button>
      </Row>
      <lng-image
        src={img}
        style={{
          width: 720,
          zIndex: -1,
          transform: [{ scale }, { rotate: `${rotation}deg` }],
        }}
      />
    </Column>
  );
};
