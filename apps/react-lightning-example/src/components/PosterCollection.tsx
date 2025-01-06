import AnimatedImage from './AnimatedImage';

interface Props {
  posterCount: number;
}

const PosterCollection = ({ posterCount }: Props) => {
  const posters = [];

  for (let i = 0; i < posterCount; i++) {
    posters.push(<AnimatedImage key={i} />);
  }

  return (
    <lng-view style={{ position: 'absolute', width: 1670, height: 1080 }}>
      {posters}
    </lng-view>
  );
};

export { PosterCollection };
