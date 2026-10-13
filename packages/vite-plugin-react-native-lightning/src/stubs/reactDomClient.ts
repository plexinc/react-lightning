type Root = { render: () => void; unmount: () => void };

const root: Root = { render: () => {}, unmount: () => {} };

export const createRoot = (): Root => root;
export const hydrateRoot = (): Root => root;

const reactDomClient: { createRoot: typeof createRoot; hydrateRoot: typeof hydrateRoot } = {
  createRoot,
  hydrateRoot,
};

export default reactDomClient;
