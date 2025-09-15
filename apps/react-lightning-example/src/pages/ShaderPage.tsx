import { Column } from '@plextv/react-lightning-components';

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
          w: 1920,
          h: 1080,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <lng-view
          shader={{
            type: 'MyCustomShader',
            props: {},
          }}
          style={{ w: 300, h: 300 }}
        />
      </Column>
    </>
  );
};
