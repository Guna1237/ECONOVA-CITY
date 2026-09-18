"""One-time extraction of owner-supplied art. Not part of npm install/build.

Usage: python extract-nova-art.py SOURCE.pdf [--output DIRECTORY]
Requires pypdf and Pillow in the developer's document tool environment.
"""
import argparse
import hashlib
from pathlib import Path
from pypdf import PdfReader
from PIL import Image, ImageChops

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('source', type=Path)
parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parent.parent / 'src/assets')
args = parser.parse_args()

expected = '00635031e6873013cb8a0a07bb489c6e6d2f03fa29e0d1a98cd8876145976321'
if hashlib.sha256(args.source.read_bytes()).hexdigest() != expected:
    raise ValueError('This extraction map requires the approved Nova City PDF. Review a new map for other artwork.')
images = list(PdfReader(args.source).pages[0].images)
if len(images) != 1 or images[0].image.size != (1536, 1024):
    raise ValueError('Unexpected embedded artwork layout')
original = images[0].image.convert('RGB')
regions = {
    'pieces': (20, 38, 640, 212), 'dice': (663, 40, 952, 212),
    'property': (969, 296, 1195, 463), 'credits': (341, 557, 446, 657),
    'influence': (286, 471, 395, 558), 'council': (929, 492, 1072, 641),
    'guide': (300, 807, 406, 945), 'trophy': (443, 682, 545, 787)
}
args.output.mkdir(parents=True, exist_ok=True)
total = 0
for name, box in regions.items():
    icon = original.crop(box)
    destination = args.output / f'nova-{name}.webp'
    icon.save(destination, format='WEBP', lossless=True, method=6)
    if ImageChops.difference(icon, Image.open(destination).convert('RGB')).getbbox() is not None:
        raise ValueError(f'Pixel verification failed: {destination.name}')
    total += destination.stat().st_size
print(f'Extracted {len(regions)} lossless icons, {total} bytes. Every pixel verified.')
