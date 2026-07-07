---
'@plextv/react-lightning-plugin-flexbox': patch
---

fix(flexbox): resolve font atlas URLs before they cross into the Yoga worker

The Yoga worker is bundled inline (`?worker&inline`), so in a production build its `self.location` is a `blob:` URL. A root-relative atlas URL like `/fonts/x.msdf.json` (what `import.meta.env.BASE_URL` produces) can't resolve against a blob base, so the worker's `fetch` threw "is not a valid URL" and font metrics never loaded — text fell back to single-line, unmeasured layout. It only reproduced in built apps; the dev server serves the worker as a real module, so root-relative URLs resolved fine. Atlas URLs are now resolved to absolute against the document URL on the main thread, before the options cross `postMessage`.
