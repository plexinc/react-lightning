---
"@plextv/react-lightning": patch
---

feat(focus): focus-when-ready, arrival-not-mount autoFocus, and destinations-on-arrival

`FocusManager.focus()` no longer drops a request for an element that isn't registered or focusable yet — it queues it and resolves the moment the element becomes ready, so callers don't have to poll across frames. A later-mounting `autoFocus` child no longer steals live focus on registration (a new `focusCommitted` flag gates the upgrade), matching native `TVFocusGuideView`, which forwards focus on arrival rather than on mount. And `destinations` are now honoured on arrival (first visit without `focusRedirect`, every visit with it), so focus forwards to a declared destination then remembers the last-focused child.
