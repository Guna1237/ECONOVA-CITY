import type { PlayerProjectionDto } from '@econova/contracts';
import { GAME_CONFIG } from '@econova/game-content';
import { ActivityCursor } from './activity.js';

export type GameSound = 'turn' | 'activity' | 'warning';
const warningWindow = (GAME_CONFIG.turnTimerSeconds - GAME_CONFIG.turnWarningSeconds) * 1000;

/** Presentation only. Snapshot baselines never play old events on reconnect. */
export class SoundCueCursor {
  private activity = new ActivityCursor();
  private gameId: string | null = null;
  private version = -1;
  private turnKey: string | null = null;
  private warned = false;

  reset(): void {
    this.activity = new ActivityCursor();
    this.gameId = null;
    this.version = -1;
    this.turnKey = null;
    this.warned = false;
  }

  receive(projection: PlayerProjectionDto, now: number): GameSound | null {
    const { public: view, self } = projection;
    if (this.gameId === view.gameId && view.stateVersion < this.version) return null;
    const initial = this.gameId !== view.gameId;
    const mine = view.turn?.playerId === self.playerId;
    const key = view.turn === null ? null : `${view.round}:${view.turn.playerId}`;
    const newTurn = key !== this.turnKey;
    if (initial || newTurn) this.warned = false;
    const fresh = this.activity.receive(view.gameId, view.stateVersion, self.activity ?? view.activity ?? []);
    this.gameId = view.gameId;
    this.version = view.stateVersion;
    this.turnKey = key;
    const remaining = view.turn?.deadlineAt === null || view.turn?.deadlineAt === undefined
      ? null : view.turn.deadlineAt - now;
    const warning = mine && view.phase === 'player_turn' && remaining !== null && remaining > 0 && remaining <= warningWindow;
    const shouldWarn = warning && !this.warned;
    if (warning) this.warned = true;
    if (initial) return null;
    if (newTurn && mine && view.phase === 'player_turn') return 'turn';
    if (shouldWarn) return 'warning';
    if (view.phase === 'paused' || view.phase === 'completed') return null;
    return fresh.length ? 'activity' : null;
  }
}

/** One reusable, quiet audio context; created only after an explicit click. */
export class GameAudio {
  private context: AudioContext | null = null;
  private lastPlayed = -Infinity;
  private voices = new Map<OscillatorNode, GainNode>();

  async enable(): Promise<boolean> {
    try {
      this.context ??= new AudioContext();
      await this.context.resume();
      return this.context.state === 'running';
    } catch { return false; }
  }

  play(cue: GameSound): void {
    const context = this.context;
    if (!context || context.state !== 'running' || context.currentTime - this.lastPlayed < 0.6) return;
    this.lastPlayed = context.currentTime;
    const notes = cue === 'turn' ? [523.25, 783.99] : cue === 'warning' ? [440, 440] : [659.25];
    try {
      notes.forEach((frequency, index) => {
        const start = context.currentTime + index * 0.14;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.045, start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);
        oscillator.connect(gain);
        gain.connect(context.destination);
        this.voices.set(oscillator, gain);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); this.voices.delete(oscillator); };
        oscillator.start(start);
        oscillator.stop(start + 0.13);
      });
    } catch { /* Audio must never interrupt a game action. */ }
  }

  async mute(): Promise<void> {
    this.clearVoices();
    try { await this.context?.suspend(); } catch { /* Optional audio. */ }
  }

  private clearVoices(): void {
    for (const [oscillator, gain] of this.voices) {
      try { oscillator.stop(); } catch { /* It may already have ended. */ }
      oscillator.disconnect();
      gain.disconnect();
    }
    this.voices.clear();
    this.lastPlayed = -Infinity;
  }

  dispose(): void {
    this.clearVoices();
    void this.context?.close().catch(() => {});
    this.context = null;
    this.lastPlayed = -Infinity;
  }
}
