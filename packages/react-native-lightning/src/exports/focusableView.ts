type FocusRegistrationProps = {
  focusable?: boolean | null;
  focusRestorationExcluded?: boolean;
};

// Native promotes any View with `focusable` set (true or false) to a spatial-nav
// target; a directional-only catcher opts in via focusRestorationExcluded alone.
export function shouldRegisterFocus(props: FocusRegistrationProps): boolean {
  return props.focusable != null || Boolean(props.focusRestorationExcluded);
}

// A registered View is an active focus target unless focusable is explicitly false.
export function isFocusActive(props: FocusRegistrationProps): boolean {
  return props.focusable !== false;
}
