import type { YogaOptions } from './types/YogaOptions';
import type { YogaManager } from './YogaManager';
import type { Workerized } from './YogaManagerWorker';

let _manager: YogaManager | undefined;
let _workerManager: Workerized<YogaManager> | undefined;
let _useWebWorker = false;

async function load(yogaOptions: YogaOptions = {}) {
  _useWebWorker = !!yogaOptions.useWebWorker;

  if (_useWebWorker) {
    const { default: workerManager } = await import('./YogaManagerWorker');

    _workerManager = workerManager;
    await workerManager.init(yogaOptions);
  } else {
    const { YogaManager } = await import('./YogaManager');
    _manager = new YogaManager();
    await _manager.init(yogaOptions);
  }
}

export default {
  load,
  get instance() {
    if (_useWebWorker) {
      if (!_workerManager) {
        throw new Error('YogaManager is not initialized');
      }

      return _workerManager;
    }

    if (!_manager) {
      throw new Error('YogaManager is not initialized');
    }

    return _manager;
  },
};
