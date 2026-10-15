# Goblins 3 Web

A mobile-first ScummVM WebAssembly player for the **Goblins Quest 3 DOS CD edition**, with the official English DOS demo available as a no-setup fallback.

## What works

- Real Goblins Quest 3 demo; no mock game screen
- Local-only full DOS CD import from a ZIP on iPhone or an extracted folder on desktop
- Selective ZIP extraction finds the playable CD folder first, skipping bundled raw disc images and duplicate installer trees that waste mobile memory
- Large music and speech files are stored as small IndexedDB chunks and read into ScummVM one chunk at a time, avoiding a second 200+ MB JavaScript copy on iPhone
- IndexedDB records contain plain binary buffers rather than Blob/File objects, avoiding WebKit's file-backed Blob storage failure
- CD music works when the extracted first audio track is supplied as `track1.ogg`; FLAC-only tracks are ignored because the hosted WebAssembly runtime has Vorbis but not FLAC decoding
- An SDL3 startup hint requests an 8192-frame browser audio buffer on iOS, giving music, speech, and animation decoding more headroom than the 2048-frame WebAssembly default
- CD validation using ScummVM's Goblins 3 CD data markers (`intro.stk` and `mus_gob3.lic`)
- Imported CD files persist in IndexedDB and are reconstructed in ScummVM's in-memory filesystem at launch; they are never sent to the server
- Safe replacement: a bad import is rejected without removing the previously working local CD library
- Direct mouse touch: tap to click, drag to move the pointer, and two-finger tap for ScummVM's native right-click
- One-tap edge controls generate a complete burst of the continuous mouse movement Goblins 3 requires to scroll wide rooms in either direction
- Dedicated Sound and Fullscreen controls; removed synthetic right-click controls that iOS does not deliver to ScummVM
- Native fullscreen where available, a visible-viewport fallback, and standalone Home Screen mode for iPhone
- Standalone landscape mode removes the decorative cabinet bar and the redundant Exit control
- Responsive landscape mode, repeated orientation realignment, and reachable safe-area edges for wide-room panning
- ScummVM IDBFS persistence for configuration and save data under its browser-persisted home directory
- ScummVM startup support files served locally, including range requests used by iOS Safari
- Demo data streamed from the ScummVM community demo mirror rather than bundled

## Local development

Use the package manager recorded in `pnpm-lock.yaml`:

```sh
pnpm dev
pnpm build
```

The server needs outbound HTTPS access to `scummvm.kuendig.io` for the WebAssembly runtime and to `scummvm-data.kuendig.io` for the demo-data proxy. ScummVM's startup support files are bundled in `public/data` so a browser launch does not depend on the community server accepting a burst of range requests.

See `THIRD_PARTY_NOTICES.md` for provenance and licensing details.
