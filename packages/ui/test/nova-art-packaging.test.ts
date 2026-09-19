import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('supplied board artwork packaging', () => {
  it('vector pawns do not reference a raster sprite sheet', () => {
    const pieces = readFileSync(new URL('../dist/marks/Pieces.js', import.meta.url), 'utf8');
    expect(pieces).not.toContain('nova-pawn-sheet');
    expect(pieces).toContain('SEAT_SHAPES');
  });
  it.each(['civic', 'idea', 'market', 'event'])('ships the unchanged %s image beside built imports', (name) => {
    const source = new URL(`../src/assets/nova-board-${name}.webp`, import.meta.url);
    const built = new URL(`../dist/assets/nova-board-${name}.webp`, import.meta.url);
    const hash = (file: URL) => createHash('sha256').update(readFileSync(file)).digest('hex');
    expect(hash(built)).toBe(hash(source));
    const js = readFileSync(new URL('../dist/marks/NovaArt.js', import.meta.url), 'utf8');
    expect(js).toContain(`../assets/nova-board-${name}.webp`);
  });
});
