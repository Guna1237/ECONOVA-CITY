import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('supplied board artwork packaging', () => {
  it('packages the exact owner-supplied PNG pawn sheet', () => {
    const hash = (file: URL) => createHash('sha256').update(readFileSync(file)).digest('hex');
    const expected = '3f8f5eb7a4459aecfc5fb79438e4d6cdb9f03089ef0e99732065cf8e18d6cb1c';
    expect(hash(new URL('../src/assets/nova-pawn-sheet.png', import.meta.url))).toBe(expected);
    expect(hash(new URL('../dist/assets/nova-pawn-sheet.png', import.meta.url))).toBe(expected);
    expect(readFileSync(new URL('../dist/marks/Pieces.js', import.meta.url), 'utf8')).toContain('../assets/nova-pawn-sheet.png');
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
