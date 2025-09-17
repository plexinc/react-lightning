import { Column } from '@plextv/react-lightning-components';

export const TexturePage = () => {
  return (
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
        texture={{
          type: 'MyCustomTexture',
          props: {
            percent: 55,
            w: 300,
            h: 300,
          },
        }}
        style={{ w: 300, h: 300, color: 0xe5a00dff }}
      />
    </Column>
  );
};
