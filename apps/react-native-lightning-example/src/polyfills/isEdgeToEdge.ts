// reanimated imports react-native-is-edge-to-edge, whose "module" entry points
// at a CJS file that vite serves without named exports. None of it means
// anything on a TV, so the app aliases it to this.
export const isEdgeToEdgeFromLibrary = () => false;
export const isEdgeToEdgeFromProperty = () => false;
export const isEdgeToEdge = () => false;
export const controlEdgeToEdgeValues = () => {};
