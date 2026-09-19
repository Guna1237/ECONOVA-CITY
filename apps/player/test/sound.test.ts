import { afterEach, describe, expect, it, vi } from 'vitest';
import { demonstrationPlayerState } from '../src/fixtures/demonstrationState.js';
import { GameAudio, SoundCueCursor } from '../src/state/sound.js';

const snapshot = (version = 1) => {
  const p = structuredClone(demonstrationPlayerState);
  p.public.stateVersion = version;
  p.public.phase = 'player_turn';
  p.public.turn!.deadlineAt = 45_000;
  p.self.activity = [];
  return p;
};

describe('optional game sound cues', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('starts silently and warns once at 30 seconds elapsed', () => {
    const cursor = new SoundCueCursor();
    const p = snapshot();
    expect(cursor.receive(p, 0)).toBeNull();
    expect(cursor.receive(p, 29_999)).toBeNull();
    expect(cursor.receive(p, 30_000)).toBe('warning');
    expect(cursor.receive(p, 31_000)).toBeNull();
    expect(cursor.receive(p, 45_000)).toBeNull();
  });

  it('does not replay activity or a late warning after reconnect or enabling sound', () => {
    const cursor = new SoundCueCursor();
    const p = snapshot();
    p.self.activity = [{ id: 'receipt:1', title: 'Rent received', text: '20 Credits', round: 1 }];
    expect(cursor.receive(p, 35_000)).toBeNull();
    expect(cursor.receive(p, 36_000)).toBeNull();
    cursor.reset();
    expect(cursor.receive(p, 37_000)).toBeNull();
    expect(cursor.receive(p, 38_000)).toBeNull();
  });

  it('plays one activity cue per new authoritative receipt, not duplicate or stale snapshots', () => {
    const cursor = new SoundCueCursor();
    cursor.receive(snapshot(), 0);
    const p = snapshot(2);
    p.self.activity = [{ id: 'receipt:2', title: 'Trade declined', text: 'A player declined your trade.', round: 1 }];
    expect(cursor.receive(p, 1)).toBe('declined');
    expect(cursor.receive(p, 2)).toBeNull();
    expect(cursor.receive(snapshot(), 3)).toBeNull();
    expect(cursor.receive(p, 4)).toBeNull();
  });

  it('announces only the local player’s new turn', () => {
    const cursor = new SoundCueCursor();
    const waiting = snapshot();
    waiting.public.turn!.playerId = waiting.public.players[1]!.playerId;
    expect(cursor.receive(waiting, 0)).toBeNull();
    expect(cursor.receive(snapshot(2), 1)).toBe('turn');
    expect(cursor.receive(snapshot(3), 2)).toBeNull();
    waiting.public.stateVersion = 4;
    expect(cursor.receive(waiting, 3)).toBeNull();
    expect(cursor.receive(waiting, 35_000)).toBeNull();
  });

  it.each([
    ['Rent received', 'received'], ['Property income', 'received'], ['Rent paid', 'paid'],
    ['Trade received', 'trade'], ['Trade completed', 'received'], ['Trade expired', 'declined'],
    ['Policy passed', 'news'], ['City news', 'news'], ['Your resources', 'activity']
  ])('uses an appropriate cue for %s without replaying it', (title, cue) => {
    const cursor = new SoundCueCursor();
    cursor.receive(snapshot(), 0);
    const p = snapshot(2);
    p.self.activity = [
      { id: 'summary', title: 'Your resources', text: 'Updated', round: 1 },
      { id: 'specific', title, text: 'Update', round: 1 }
    ];
    expect(cursor.receive(p, 1)).toBe(cue);
    expect(cursor.receive(p, 2)).toBeNull();
    expect(cursor.receive(p, 30_000)).toBe('warning');
  });

  it('keeps pauses and sub-phases silent and schedules warnings from the resumed deadline', () => {
    const cursor = new SoundCueCursor();
    cursor.receive(snapshot(), 0);
    const paused = snapshot(2);
    paused.public.phase = 'paused';
    expect(cursor.receive(paused, 31_000)).toBeNull();
    const subPhase = snapshot(3);
    subPhase.public.turn!.deadlineAt = null;
    expect(cursor.receive(subPhase, 32_000)).toBeNull();
    const resumed = snapshot(4);
    resumed.public.turn!.deadlineAt = 90_000;
    expect(cursor.receive(resumed, 60_000)).toBeNull();
    expect(cursor.receive(resumed, 75_000)).toBe('warning');
  });

  it('baselines a new game instead of announcing historical events', () => {
    const cursor = new SoundCueCursor();
    cursor.receive(snapshot(), 0);
    const p = snapshot();
    p.public.gameId = 'another-game' as typeof p.public.gameId;
    expect(cursor.receive(p, 0)).toBeNull();
  });

  it('does not create audio before an explicit enable, and gracefully handles blocked audio', async () => {
    const audio = new GameAudio();
    const constructor = vi.fn(() => { throw new Error('Audio unavailable'); });
    vi.stubGlobal('AudioContext', constructor);
    audio.play('turn');
    expect(constructor).not.toHaveBeenCalled();
    expect(await audio.enable()).toBe(false);
    expect(() => audio.play('warning')).not.toThrow();
    audio.dispose();
  });

  it('reuses the context, limits rapid cues, mutes and releases resources', async () => {
    const oscillator = { type: '', frequency: { value: 0 }, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null as null | (() => void) };
    const gain = { gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() };
    const context = { state: 'running', currentTime: 0, destination: {}, createOscillator: vi.fn(() => oscillator), createGain: vi.fn(() => gain), resume: vi.fn(async () => { context.state = 'running'; }), suspend: vi.fn(async () => { context.state = 'suspended'; }), close: vi.fn(async () => {}) };
    vi.stubGlobal('AudioContext', class { constructor() { return context; } });
    const audio = new GameAudio();
    expect(await audio.enable()).toBe(true);
    audio.play('activity');
    audio.play('activity');
    expect(context.createOscillator).toHaveBeenCalledTimes(1);
    expect(gain.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0.025, 0.018);
    oscillator.onended?.();
    expect(oscillator.disconnect).toHaveBeenCalled();
    expect(gain.disconnect).toHaveBeenCalled();
    await audio.mute();
    context.currentTime = 2;
    audio.play('turn');
    expect(context.createOscillator).toHaveBeenCalledTimes(1);
    await audio.enable();
    audio.setVolume('standard');
    audio.play('turn');
    expect(context.createOscillator).toHaveBeenCalledTimes(3);
    expect(gain.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0.05, 2.118);
    // An important timer reminder is not dropped behind a recent activity cue.
    context.currentTime = 2.2;
    audio.play('warning');
    expect(context.createOscillator).toHaveBeenCalledTimes(5);
    await audio.mute();
    expect(oscillator.stop).toHaveBeenLastCalledWith();
    audio.dispose();
    expect(context.close).toHaveBeenCalledTimes(1);
  });
});
