import { type ReactNode, Suspense, use } from 'react';
import type { JSX } from 'react/jsx-runtime';

const never = new Promise<never>(() => {});

export type FreezeProps = {
  frozen: boolean;
  children?: ReactNode;
};

const Suspender = ({ frozen, children }: FreezeProps) => {
  if (frozen) {
    use(never);
  }

  return children;
};

export const Freeze = ({ frozen, children }: FreezeProps): JSX.Element => (
  <Suspense fallback={null}>
    <Suspender frozen={frozen}>{children}</Suspender>
  </Suspense>
);
