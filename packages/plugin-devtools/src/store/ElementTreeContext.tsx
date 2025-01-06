import { BidirectionalDataTree } from '../tree/BidirectionalDataTree';
import type { SimpleElement } from '../types';
import { createRefStoreContext } from './createRefStoreContext';

const { Context, Provider } = createRefStoreContext(
  new BidirectionalDataTree<SimpleElement>(),
);

export { Context as ElementTreeContext, Provider as ElementTreeProvider };
