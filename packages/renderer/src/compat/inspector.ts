/** No DOM mirror in the compat renderer; testID e2e selectors don't work against it. */
export class Inspector {
  public constructor(_canvas?: unknown, _settings?: unknown) {}
  public createNode(node: unknown): unknown {
    return node;
  }
  public createTextNode(node: unknown): unknown {
    return node;
  }
  public destroy(): void {}
  public animateNode(_node: unknown, _props: unknown, _settings: unknown): void {}
}
