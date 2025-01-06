// Keep in sync with shared/getComponentNameFromType
export function getWrappedName(
  outerType: { displayName?: string; name?: string },
  innerType: { displayName?: string; name?: string },
  wrapperName: string,
): string {
  const functionName = innerType.displayName || innerType.name || '';
  return (
    outerType.displayName ||
    (functionName !== '' ? `${wrapperName}(${functionName})` : wrapperName)
  );
}
