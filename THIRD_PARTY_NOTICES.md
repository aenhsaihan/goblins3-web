# Third-party notices

## ScummVM WebAssembly runtime

This project loads a ScummVM WebAssembly build through a narrow same-origin proxy. The runtime itself is not committed into this repository. The matching startup support files and Gob engine plugin are committed under `public/data` so they can be served reliably from the deployment.

- Integration build source: https://github.com/chkuendig/scummvm-demo/tree/4babbd680a05a724de2ebf20ee317cd53742b9bf
- Corresponding ScummVM source: https://github.com/chkuendig/scummvm/tree/de7b4e39851d0111ec7e3f1165fd9c2997ee9419
- ScummVM license: GNU General Public License v3.0 or later; see https://github.com/chkuendig/scummvm/blob/de7b4e39851d0111ec7e3f1165fd9c2997ee9419/COPYING

The runtime proxy exposes only the main ScummVM WebAssembly files. The bundled support files were downloaded from the integration build's public data directory and correspond to the source revisions above.

## Goblins Quest 3 demo data

The game archive is **not** included in this repository or deployment bundle. At runtime, ScummVM streams the English DOS demo from the public ScummVM community web-demo data mirror.

ScummVM's official demo catalog publishes the same English DOS demo at:

https://downloads.scummvm.org/frs/demos/gob/gob3-dos-demo-en.zip

The archive identifies itself as a playable demo but contains no explicit standalone redistribution license. The original game and demo data remain copyrighted by their respective rights holders. This project is not affiliated with or endorsed by Coktel Vision, Sierra, ScummVM, or the current rights holder.
