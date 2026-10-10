# Original game art

The hero-tuktuk.glb model, generated PNG textures, custom environment/vehicle geometry,
and authoring scripts in this change are original artwork created for Tuk Tuk Rush: Bangkok.
They may be used, modified, and distributed under the MIT License below.
No game artwork or third-party vehicle model was copied or redistributed.

Copyright (c) 2026 Tuk Tuk Rush: Bangkok contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this
software and associated documentation files (the "Software"), to deal in the Software
without restriction, including without limitation the rights to use, copy, modify,
merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be included in all copies
or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Font-derived signage

Sign textures were rendered using Noto Sans Thai and Noto Sans SC from Google Fonts,
licensed under SIL Open Font License 1.1. Font binaries are not distributed with the
application. The OFL does not require a document/image made using these fonts to be
licensed under the OFL. The authoring script downloads checksum-verified font files
from a pinned Google Fonts repository commit, into a temporary authoring cache only.

Sources and font licenses:

- https://github.com/google/fonts/tree/bd8f81ddb5c74d5c8897b36ad88b440266245103/ofl/notosansthai
- https://github.com/google/fonts/tree/bd8f81ddb5c74d5c8897b36ad88b440266245103/ofl/notosanssc
- https://openfontlicense.org/

The small Latin captions also use the system DejaVu Sans font when generating the
texture atlas. No font binary was shipped in that original baked-texture pass. Legacy signs are generic fictional
businesses using real words, not copies of commercial logos. The vehicle plate is
fictional. No external photos, models, textures, or API keys are required at runtime.

## Reconstruction fonts and geographic data

The reconstruction distributes small Noto Sans Thai and Noto Serif SC font subsets
in `fonts/thai-signs.ttf` and `fonts/chinese-signs.ttf`, under SIL OFL 1.1, not MIT.
The accompanying `OFL-Thai.txt` and `OFL-Chinese.txt` preserve their notices.
They were obtained from Google Fonts' text-subset service on 2026-10-10; see
`docs/graphics/reconstruction/RESEARCH.md` for the source and subset recipe.
The earlier statement about not shipping binaries applies to legacy baked PNGs.

Road-coordinate data adapted from OpenStreetMap is © OpenStreetMap contributors,
under ODbL 1.0: https://www.openstreetmap.org/copyright and
https://opendatacommons.org/licenses/odbl/1-0/ .
The editable adapted geographic dataset is distributed as `src/game/mapData.ts`;
the connected arcade graph and clearly labeled fictional adaptations are in
`src/game/world.ts`. This data license is separate from the original game artwork.

New facade meshes, sign framing and motifs are original procedural artwork.
One sign uses the factual name ฮั่วเซ่งเฮง (Hua Seng Heng); it is a simplified
reference label, not a licensed commercial logo or an endorsement. Commercial
trademark/brand clearance has not been obtained. Research photographs are
reference-only and are NOT included in the game or licensed as game artwork.
