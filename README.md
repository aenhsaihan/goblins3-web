# Goblins 3 Web

A mobile-first wrapper around the real English DOS demo of **Goblins Quest 3**, running in ScummVM WebAssembly.

## What works

- Real Goblins Quest 3 demo; no mock game screen
- Direct mouse touch: tap to click, drag to move the pointer, and two-finger tap for ScummVM's native right-click
- One-tap edge controls generate a complete burst of the continuous mouse movement Goblins 3 requires to scroll wide rooms in either direction
- Dedicated Sound and Fullscreen controls; removed synthetic right-click controls that iOS does not deliver to ScummVM
- Native fullscreen where available, a visible-viewport fallback, and standalone Home Screen mode for iPhone
- Standalone landscape mode removes the decorative cabinet bar and the redundant Exit control
- Responsive landscape mode, repeated orientation realignment, and reachable safe-area edges for wide-room panning
- ScummVM IDBFS persistence for configuration and save data under its browser-persisted home directory
- ScummVM startup support files served locally, including range requests used by iOS Safari
- Game data streamed from the ScummVM community demo mirror rather than bundled

## Local development

Use the package manager recorded in `pnpm-lock.yaml`:

```sh
pnpm dev
pnpm build
```

The server needs outbound HTTPS access to `scummvm.kuendig.io` for the WebAssembly runtime and to `scummvm-data.kuendig.io` for the demo-data proxy. ScummVM's startup support files are bundled in `public/data` so a browser launch does not depend on the community server accepting a burst of range requests.

See `THIRD_PARTY_NOTICES.md` for provenance and licensing details.
