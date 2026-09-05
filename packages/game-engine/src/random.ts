export interface RandomSource {
  nextInt(maxExclusive: number): number;
}

export const createSeededRandom = (seed: number): RandomSource => {
  let state = seed >>> 0;
  return {
    nextInt(maxExclusive: number): number {
      if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
        throw new RangeError("maxExclusive must be a positive integer");
      }
      state += 0x6d2b79f5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      const unit = ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
      return Math.floor(unit * maxExclusive);
    }
  };
};

export const shuffle = <T>(values: readonly T[], random: RandomSource): T[] => {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const otherIndex = random.nextInt(index + 1);
    const current = result[index];
    const other = result[otherIndex];
    if (current === undefined || other === undefined) {
      throw new RangeError("Shuffle index was outside the collection");
    }
    result[index] = other;
    result[otherIndex] = current;
  }
  return result;
};
