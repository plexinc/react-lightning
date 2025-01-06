import { Column } from '@plex/react-lightning-components';

export const TexturePage = () => {
  return (
    <>
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
        <lng-view
          texture={{
            type: 'MyCustomTexture',
            props: {
              percent: 5,
              width: 300,
              height: 300,
            },
          }}
          style={{ width: 300, height: 300, color: 0xe5a00dff }}
        />
      </Column>
    </>
  );
};
