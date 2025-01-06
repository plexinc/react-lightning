import { Column } from '@plex/react-lightning-components';

export const ShaderPage = () => {
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
          shader={{
            type: 'MyCustomShader',
            props: {},
          }}
          style={{ width: 300, height: 300 }}
        />
      </Column>
    </>
  );
};
