import { addons } from 'storybook/manager-api';
import theme from './theme';

addons.setConfig({
  theme,
  showPanel: true,
  panelPosition: 'right',
});
