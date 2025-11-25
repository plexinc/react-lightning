import type {
  LightningElement,
  LightningElementProps,
  LightningViewElementStyle,
  Rect,
  RendererNode,
} from '@plextv/react-lightning';
import {
  Component,
  type ComponentType,
  type ForwardedRef,
  type ForwardRefExoticComponent,
  forwardRef,
  type PropsWithoutRef,
  type RefAttributes,
} from 'react';
import type { NativeMethods, StyleProp, ViewStyle } from 'react-native';
import type {
  BaseAnimationBuilder,
  LayoutAnimationFunction,
} from 'react-native-reanimated-original';
import { isAnimatedStyle } from '../isAnimatedStyle';
import type { AnimatedStyle } from '../types/AnimatedStyle';
import type { ReanimatedAnimation } from '../types/ReanimatedAnimation';
import { toLightningAnimationAndStyles } from '../utils/toLightningAnimationAndStyles';

type NativeLightningElement = NativeMethods & LightningElement;

type AnimatedProps<T extends {}> = T &
  Pick<LightningElementProps, 'transition'> & {
    style?: StyleProp<ViewStyle>;
    forwardedRef?: ForwardedRef<NativeLightningElement>;
    layout?: ReanimatedAnimation;
    entering?: ReanimatedAnimation;
    exiting?: ReanimatedAnimation;
  };

function flattenStyles<T>(
  style: StyleProp<T>,
  animatedStyles: Set<AnimatedStyle>,
  flattenedStyles: Partial<T>,
): void;
function flattenStyles<T>(
  style: StyleProp<T>,
): [Set<AnimatedStyle>, Partial<T>];
function flattenStyles<T>(
  style: StyleProp<T>,
  animatedStyles: Set<AnimatedStyle> = new Set(),
  flattenedStyles: Partial<T> = {},
) {
  if (!style) {
    return [animatedStyles, flattenedStyles];
  }

  if (Array.isArray(style)) {
    for (let i = 0; i < style.length; i++) {
      const s = style[i];

      if (s != null && s !== false) {
        flattenStyles(s as StyleProp<T>, animatedStyles, flattenedStyles);
      }
    }
  } else if (isAnimatedStyle(style)) {
    animatedStyles.add(style);
  } else if (style != null && style !== false) {
    Object.assign(flattenedStyles, style);
  }

  return [animatedStyles, flattenedStyles];
}

function isAnimationBuilder(
  layoutAnimationOrBuilder: ReanimatedAnimation,
): layoutAnimationOrBuilder is BaseAnimationBuilder {
  return (
    !!layoutAnimationOrBuilder &&
    'build' in layoutAnimationOrBuilder &&
    typeof layoutAnimationOrBuilder.build === 'function'
  );
}

function getBuilder(layoutAnimationOrBuilder?: ReanimatedAnimation) {
  if (!layoutAnimationOrBuilder) {
    return null;
  }

  if (isAnimationBuilder(layoutAnimationOrBuilder)) {
    return layoutAnimationOrBuilder.build();
  } else if (typeof layoutAnimationOrBuilder === 'function') {
    return layoutAnimationOrBuilder;
  } else if (import.meta.env.DEV) {
    console.warn(
      'This animation is not supported in React Lightning: ',
      layoutAnimationOrBuilder,
    );
  }

  return null;
}

function buildTransitions(
  builder: LayoutAnimationFunction | null,
  layout: (Rect & { globalX: number; globalY: number }) | null,
) {
  if (!builder) {
    return null;
  }

  const { x, y, w, h, globalX, globalY } = layout || {
    x: 0,
    y: 0,
    globalX: 0,
    globalY: 0,
    w: 0,
    h: 0,
  };

  const animation = builder({
    targetOriginX: x,
    targetOriginY: y,
    targetWidth: w,
    targetHeight: h,
    targetGlobalOriginX: globalX,
    targetGlobalOriginY: globalY,
    targetBorderRadius: 0,
    windowWidth: 1920,
    windowHeight: 1080,
    currentOriginX: x,
    currentOriginY: y,
    currentWidth: w,
    currentHeight: h,
    currentGlobalOriginX: globalX,
    currentGlobalOriginY: globalY,
    currentBorderRadius: 0,
  });

  if (!animation) {
    return null;
  }

  // return toLightningAnimationAndStyles(animation.animations);
  return animation;
}

export type AnimatedComponent<TProps extends {}> = ForwardRefExoticComponent<
  PropsWithoutRef<AnimatedProps<TProps>> & RefAttributes<NativeLightningElement>
>;

export function createAnimatedComponent<TProps extends {}>(
  ComponentToAnimate: ComponentType<AnimatedProps<TProps>>,
): AnimatedComponent<TProps> {
  class AnimatedComponentInternal extends Component<AnimatedProps<TProps>> {
    static displayName =
      `LightningAnimated(${ComponentToAnimate.displayName || ComponentToAnimate.name || 'Component'})`;

    private _ref: NativeLightningElement | null = null;
    private _animatedStyles: Set<AnimatedStyle> = new Set();
    private _styles: Partial<ViewStyle> | null = null;
    private _cachedBuilders = new WeakMap<
      ReanimatedAnimation,
      LayoutAnimationFunction | null
    >();

    constructor(props: AnimatedProps<TProps>) {
      super(props);

      this._transformStyles();
    }

    componentDidMount(): void {
      this._runAnimation(this._getCachedBuilder(this.props.entering));
    }

    private _getCachedBuilder(animation?: ReanimatedAnimation) {
      if (!animation) {
        return null;
      }

      if (!this._cachedBuilders.has(animation)) {
        this._cachedBuilders.set(animation, getBuilder(animation));
      }

      return this._cachedBuilders.get(animation) || null;
    }

    componentDidUpdate(prevProps: Readonly<AnimatedProps<TProps>>): void {
      const styleChanged = this.props.style !== prevProps.style;
      const layoutChanged = this.props.layout !== prevProps.layout;

      if (styleChanged) {
        this._transformStyles();
      }

      if (styleChanged || layoutChanged) {
        this._runAnimation(this._getCachedBuilder(this.props.layout));
      }
    }

    componentWillUnmount(): void {
      if (!this.props.exiting || !this._ref) {
        return;
      }

      this._ref.deferNodeRemoval = (destroy) => {
        this._runAnimation(this._getCachedBuilder(this.props.exiting), destroy);
      };
    }

    render() {
      return (
        <ComponentToAnimate
          {...this.props}
          style={this._styles}
          ref={this._setRefs}
        />
      );
    }

    _resolveComponentRef = (ref: NativeLightningElement | null) => {
      const componentRef = ref as NativeLightningElement & {
        getAnimatableRef?: () => NativeLightningElement;
      };

      // Component can specify ref which should be animated when animated version of the component is created.
      // Otherwise, we animate the component itself.
      if (componentRef?.getAnimatableRef) {
        return componentRef.getAnimatableRef();
      }

      return componentRef;
    };

    _setRefs = (ref: NativeLightningElement | null) => {
      if (!ref || this._ref === ref) {
        return;
      }

      const forwardedRef = this.props.forwardedRef;
      const newRef = this._resolveComponentRef(ref);

      if (typeof forwardedRef === 'function') {
        // Handle function-based refs. String-based refs are handled as functions.
        forwardedRef(newRef);
      } else if (typeof forwardedRef === 'object' && forwardedRef != null) {
        // Handle createRef-based refs
        forwardedRef.current = newRef;
      }

      for (const animatedStyle of this._animatedStyles) {
        // Remove old refs and add our new ref to our animated styles
        if (this._ref) {
          animatedStyle.viewsRef.delete(this._ref);
        }

        animatedStyle.viewsRef.add(newRef);
      }

      this._ref = newRef;
    };

    _transformStyles() {
      const [newAnimatedStyles, flattenedStyles] = flattenStyles(
        this.props.style,
      );

      if (this._ref) {
        // Remove refs for any animated styles that were removed
        for (const oldAnimatedStyle of this._animatedStyles) {
          oldAnimatedStyle.viewsRef.delete(this._ref);
        }

        for (const newAnimatedStyle of newAnimatedStyles) {
          newAnimatedStyle.viewsRef.add(this._ref);
        }
      }

      this._animatedStyles = newAnimatedStyles;
      this._styles = flattenedStyles;
    }

    private _runAnimation(
      builder: LayoutAnimationFunction | null,
      callback?: () => void,
    ) {
      if (!this._ref || !builder) {
        callback?.();
        return;
      }

      const el = this._ref;

      this._ref.measure((x, y, w, h) => {
        const absRect = this._ref?.getBoundingClientRect();

        const layoutAnimation = buildTransitions(builder, {
          x,
          y,
          globalX: absRect?.left || 0,
          globalY: absRect?.top || 0,
          w,
          h,
        });

        if (!layoutAnimation) {
          callback?.();
          return;
        }

        const lightningAnimation = toLightningAnimationAndStyles(
          layoutAnimation.animations,
        );

        el.once('animationFinished', () => {
          if (layoutAnimation.callback) {
            layoutAnimation.callback(true);
          }
          callback?.();
        });

        for (const [key, value] of Object.entries(
          layoutAnimation.initialValues,
        )) {
          el.setNodeProp(
            key as keyof RendererNode<NativeLightningElement>,
            value,
            false,
          );
        }

        el?.setProps({
          style: lightningAnimation.style as LightningViewElementStyle,
          transition: lightningAnimation.transition,
        });
      });
    }
  }

  return forwardRef<NativeLightningElement, AnimatedProps<TProps>>(
    (props, forwardedRef) => {
      return (
        <AnimatedComponentInternal
          {...(props as AnimatedProps<TProps>)}
          forwardedRef={forwardedRef}
        />
      );
    },
  );
}
