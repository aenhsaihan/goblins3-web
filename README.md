# Goblins 3 Web

A mobile-first wrapper around the real English DOS demo of **Goblins Quest 3**, running in ScummVM WebAssembly.

## What works

- Real Goblins Quest 3 demo; no mock game screen
- Tap/drag input, two-finger right-click from ScummVM, and a custom 520 ms long-press right-click
- Dedicated Inventory, Sound, and Fullscreen controls
- Responsive landscape mode and safe-area support
- ScummVM IDBFS persistence for configuration and save data
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
