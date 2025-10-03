import { FocusGroup } from '@plextv/react-lightning';
import { useNavigate } from 'react-router-dom';
import { Button } from './Button';

export const Nav = () => {
  const navigate = useNavigate();

  return (
    <FocusGroup
      style={{
        w: 1800,
        h: 80,
        x: 60,
        y: 40,
        color: 0xffffff22,
        borderRadius: 8,
      }}
    >
      <Button
        autoFocus
        label="Index"
        variant="accent"
        style={{ w: 200, h: 40, x: 1800 / 2 - 250, y: 20 }}
        onPress={() => navigate('/')}
      />
      <Button
        label="Browse"
        variant="accent"
        style={{ w: 200, h: 40, x: 1800 / 2 + 50, y: 20 }}
        onPress={() => navigate('/browse')}
      />
    </FocusGroup>
  );
};
