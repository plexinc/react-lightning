import { keyEventBus } from '@plextv/react-lightning';

import { type BackHandlerStatic, createBackHandler } from '../tv/backHandler';

export const BackHandler: BackHandlerStatic = createBackHandler(keyEventBus, () => {
  window.close();
});
