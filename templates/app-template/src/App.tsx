import { FocusGroup } from '@plextv/react-lightning';
import { Outlet } from 'react-router-dom';
import { Nav } from './components/Nav';

export const App = () => {
  return (
    <FocusGroup>
      <Nav />
      <Outlet />
    </FocusGroup>
  );
};
