export type AddMissingProps<T, U> = Omit<U, keyof T> & T;
