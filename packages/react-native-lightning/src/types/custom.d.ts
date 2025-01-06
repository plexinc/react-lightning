declare module '*.png' {
  const path: string;
  export default path;
}

type AddMissingProps<T, U> = Omit<U, keyof T> & T;
