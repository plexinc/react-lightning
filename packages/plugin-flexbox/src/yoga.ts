import type { YogaOptions } from './types/YogaOptions';

async function load(yogaOptions: YogaOptions = {}) {
  if (yogaOptions.useWebWorker) {
    const { default: createWorkerManager } = await import(
      './YogaManagerWorker'
    );
    const workerManager = createWorkerManager();

    await workerManager.init(yogaOptions);

    return workerManager;
  } else {
    const { YogaManager } = await import('./YogaManager');
    const manager = new YogaManager();

    await manager.init(yogaOptions);

    return manager;
  }
}

export default load;
