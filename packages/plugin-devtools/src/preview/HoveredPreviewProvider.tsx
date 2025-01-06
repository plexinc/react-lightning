import { createRefStoreContext } from '../store/createRefStoreContext';
import type { SimpleElement } from '../types';

const { Context, Provider } = createRefStoreContext<SimpleElement | null>(null);

export { Context as HoveredPreviewContext, Provider as HoveredPreviewProvider };
