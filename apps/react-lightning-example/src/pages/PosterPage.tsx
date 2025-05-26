import { Column, Row } from '@plextv/react-lightning-components';
import Button from '../components/Button';

export const PosterPage = () => {
  return (
    <Column
      style={{
        width: 1920,
        height: 1080,
        justifyContent: 'space-evenly',
        alignItems: 'center',
      }}
    >
      <lng-image src="https://picsum.photos/200/300" />

      <Row
        style={{
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Button>Beep</Button>
        <lng-text
          style={{
            fontSize: 40,
            lineHeight: 50,
            marginLeft: 20,
            marginRight: 20,
          }}
        >
          These should all be centered...
        </lng-text>
        <Button>Boop</Button>
      </Row>

      <lng-image src="https://picsum.photos/200/300" />
    </Column>
  );
};
