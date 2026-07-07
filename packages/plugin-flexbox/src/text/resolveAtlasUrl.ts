/**
 * Resolve a font atlas URL against a base href on the main thread.
 *
 * The Yoga worker is bundled inline (`?worker&inline`), so in a production
 * build its `self.location` is a `blob:` URL. A root-relative fetch like
 * `/fonts/x.json` can't resolve against a blob base and throws. Resolving to an
 * absolute URL here, before the URL crosses into the worker, sidesteps that.
 *
 * `baseHref` should be the main thread's document URL. A blob base can't
 * resolve a relative path, so on failure (or no base) we hand back the input
 * untouched.
 */
export function resolveAtlasUrl(
  url: string,
  baseHref: string | undefined,
): string {
  if (!baseHref) {
    return url;
  }

  try {
    return new URL(url, baseHref).href;
  } catch {
    return url;
  }
}
