import { Outlet } from 'react-router-dom';
import { Nav } from './components/Nav';

export const App = () => {
  return (
    <>
      <Nav />
      <Outlet />
    </>
  );
};
