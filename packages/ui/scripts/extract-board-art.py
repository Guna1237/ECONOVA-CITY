"""Extract unchanged icons from the owner's approved PNG sheet.

Developer-only: python extract-board-art.py SOURCE.png
The npm build uses checked-in lossless WebP files, not this script.
"""
import argparse
import hashlib
from pathlib import Path
from PIL import Image, ImageChops

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('source', type=Path)
args = parser.parse_args()
if hashlib.sha256(args.source.read_bytes()).hexdigest() != '3f8f5eb7a4459aecfc5fb79438e4d6cdb9f03089ef0e99732065cf8e18d6cb1c':
    raise ValueError('Expected the owner-supplied Nova City PNG. Review crop bounds for any other source.')
original = Image.open(args.source).convert('RGB')
if original.size != (724, 1024):
    raise ValueError('Unexpected source dimensions')
regions = {
    'civic': (500, 503, 562, 572),
    'idea': (224, 507, 260, 561),
    'market': (174, 532, 218, 577),
    'event': (313, 398, 375, 490)
}
output = Path(__file__).resolve().parent.parent / 'src/assets'
for name, bounds in regions.items():
    icon = original.crop(bounds)
    destination = output / f'nova-board-{name}.webp'
    icon.save(destination, 'WEBP', lossless=True, method=6)
    if ImageChops.difference(icon, Image.open(destination).convert('RGB')).getbbox():
        raise ValueError(f'Pixel mismatch: {name}')
print(f'Extracted and pixel-verified {len(regions)} board icons.')
