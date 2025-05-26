import { Column } from '@plextv/react-lightning-components';
import { useCallback, useState } from 'react';
import Button from '../components/Button';
import { PosterCollection } from '../components/PosterCollection';

export const AnimationPage = () => {
  const [numPosters, setNumPosters] = useState(1);

  const addPoster = useCallback(() => {
    setNumPosters(numPosters + 1);
  }, [numPosters]);
  const removePoster = useCallback(() => {
    setNumPosters(Math.max(numPosters - 1, 1));
  }, [numPosters]);

  return (
    <>
      <Column focusable style={{ gap: 20, zIndex: 10 }}>
        <lng-text style={{ color: 0xffffffff, fontSize: 50 }}>
          Poster Count: {numPosters}
        </lng-text>
        <Column focusable style={{ width: 200, gap: 10 }}>
          <Button onPress={addPoster}>Add image</Button>
          <Button onPress={removePoster}>Remove image</Button>
        </Column>
      </Column>

      <PosterCollection key="posterCollection" posterCount={numPosters} />
    </>
  );
};
