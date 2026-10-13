declare module 'react-native' {
  type Component = (props: never) => unknown;

  export const FlatList: Component;
  export const Pressable: Component;
  export const RefreshControl: Component;
  export const ScrollView: Component;
  export const Switch: Component;
  export const TextInput: Component;
  export const View: Component;
}
