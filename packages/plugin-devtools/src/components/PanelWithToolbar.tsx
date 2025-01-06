import type { FC } from 'react';
import { useTheme } from '../hooks/useTheme';

type Props = {
  children: JSX.Element | null;
  toolbar: JSX.Element;
};

export const PanelWithToolbar: FC<Props> = ({ children, toolbar }) => {
  const theme = useTheme();

  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          flex: `0 0 ${theme.toolbarHeight}px`,
          alignContent: 'center',
          padding: '0 8px',
        }}
      >
        {toolbar}
      </div>
      <div
        style={{
          backgroundColor: theme.border,
          width: '100%',
          flex: '0 0 1px',
        }}
      />
      <div
        style={{
          display: 'flex',
          flex: '0 0 auto',
          height: `calc(100% - ${theme.toolbarHeight + 1}px)`,
          justifyContent: 'center',
        }}
      >
        {children}
      </div>
    </div>
  );
};
