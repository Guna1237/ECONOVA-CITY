# Nova City artwork provenance

## Board PNG, received 2026-09-18

The owner also supplied `1789697385425-4679f874-c4eb-44c1-b75c-0c3e640c5990_1.png` (724 by 1024). SHA-256: `3f8f5eb7a4459aecfc5fb79438e4d6cdb9f03089ef0e99732065cf8e18d6cb1c`.

Four unchanged crops (civic building, lightbulb, coins, question card) mark the four canonical special spaces. `scripts/extract-board-art.py` records their exact bounds and verifies pixel-identical lossless WebP encoding. Total: 16,632 bytes. These icons illustrate existing spaces only; the sheet does not define gameplay. Normal builds copy these checked-in files with the existing asset pipeline.

## Original PDF extracts

Source: owner-supplied `Nova_City_Monopoly_Elements.pdf`, received 2026-09-17. The PDF is reference artwork, not a gameplay specification. This note records provenance, not a claim about third-party licensing.

SHA-256: `00635031e6873013cb8a0a07bb489c6e6d2f03fa29e0d1a98cd8876145976321`.

The page embeds one 1536 by 1024 illustration sheet. Eight rectangular regions were extracted without rescaling, redrawing, recoloring, or removing their illustrated backgrounds. Lossless WebP encoding was verified against the extracted RGB pixels. Combined size: 232,108 bytes. `scripts/extract-nova-art.py` contains the exact bounds and a source-hash check.

The checked-in WebP files are the build inputs. Normal npm install/build needs neither the PDF nor Python. The existing copy-assets script copies them to dist/assets; static imports in NovaArt.tsx let Vite fingerprint and bundle them locally. No CDN or external art URL is used.

The real `econova-crest.png` is unchanged. Existing seat colors, distinctive seat silhouettes, district identity, property mapping, and authoritative dice are unchanged. The illustrated pawns are decorative on the welcome screen, not a new seat assignment. Illustrated dice in the guide are not game outcomes. Monopoly-specific currency denominations, GO payouts, and other implied mechanics are not imported into ECONOVA.
