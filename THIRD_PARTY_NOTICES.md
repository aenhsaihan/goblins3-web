# Third-party notices

## ScummVM WebAssembly runtime

The stable demo and CD edition load the matching integration build through a narrow same-origin proxy. An opt-in low-DPI experiment uses a Gob-only ScummVM WebAssembly build committed under `public/runtime-custom`, with the matching startup support files under `public/data`.

- Integration build source: https://github.com/chkuendig/scummvm-demo/tree/4babbd680a05a724de2ebf20ee317cd53742b9bf
- Corresponding ScummVM source: https://github.com/chkuendig/scummvm/tree/de7b4e39851d0111ec7e3f1165fd9c2997ee9419
- ScummVM license: GNU General Public License v3.0 or later; see https://github.com/chkuendig/scummvm/blob/de7b4e39851d0111ec7e3f1165fd9c2997ee9419/COPYING
- Local source patch used for the experimental runtime: `patches/scummvm-web-low-dpi.patch`

The runtime proxy exposes only the integration build's main WebAssembly files. The bundled experimental runtime was compiled with Emscripten 6.0.11, the Gob engine built in, and Ogg/Vorbis support enabled. The bundled support files correspond to the source revisions above.

## fflate

The local CD importer uses fflate 0.7.5 to extract user-selected ZIP archives in the browser.

- Source: https://github.com/101arrowz/fflate
- License: MIT

## Goblins Quest 3 demo data

The game archive is **not** included in this repository or deployment bundle. At runtime, ScummVM streams the English DOS demo from the public ScummVM community web-demo data mirror.

ScummVM's official demo catalog publishes the same English DOS demo at:

https://downloads.scummvm.org/frs/demos/gob/gob3-dos-demo-en.zip

The archive identifies itself as a playable demo but contains no explicit standalone redistribution license. The original game and demo data remain copyrighted by their respective rights holders. This project is not affiliated with or endorsed by Coktel Vision, Sierra, ScummVM, or the current rights holder.
