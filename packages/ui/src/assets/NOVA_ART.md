# Nova City artwork provenance

Source: owner-supplied `Nova_City_Monopoly_Elements.pdf`, received 2026-09-17. The PDF is reference artwork, not a gameplay specification. This note records provenance, not a claim about third-party licensing.

SHA-256: `00635031e6873013cb8a0a07bb489c6e6d2f03fa29e0d1a98cd8876145976321`.

The page embeds one 1536 by 1024 illustration sheet. Eight rectangular regions were extracted without rescaling, redrawing, recoloring, or removing their illustrated backgrounds. Lossless WebP encoding was verified against the extracted RGB pixels. Combined size: 232,108 bytes. `scripts/extract-nova-art.py` contains the exact bounds and a source-hash check.

The checked-in WebP files are the build inputs. Normal npm install/build needs neither the PDF nor Python. The existing copy-assets script copies them to dist/assets; static imports in NovaArt.tsx let Vite fingerprint and bundle them locally. No CDN or external art URL is used.

The real `econova-crest.png` is unchanged. Existing seat colors, distinctive seat silhouettes, district identity, property mapping, and authoritative dice are unchanged. The illustrated pawns are decorative on the welcome screen, not a new seat assignment. Illustrated dice in the guide are not game outcomes. Monopoly-specific currency denominations, GO payouts, and other implied mechanics are not imported into ECONOVA.
