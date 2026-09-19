import { useEffect, useRef, useState, type ReactElement } from 'react';
import { GAME_CONFIG } from '@econova/game-content';
import { usePlayerSession } from '../state/PlayerSession.js';
import { GameAudio, SoundCueCursor } from '../state/sound.js';

const SpeakerMark = ({ on }: { readonly on: boolean }): ReactElement => (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
    <path d="M2 6h2.5L8 3v10L4.5 10H2z" fill="currentColor" />
    {on ? (
      <path
        d="M10.5 5.5a3.5 3.5 0 0 1 0 5M12.5 3.5a6.5 6.5 0 0 1 0 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    ) : (
      <path
        d="M10.5 6l4 4M14.5 6l-4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    )}
  </svg>
);

export const SoundControl = (): ReactElement => {
  const { projection, link, mode } = usePlayerSession();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [visible, setVisible] = useState(true);
  const audio = useRef<GameAudio | null>(null);
  const cursor = useRef(new SoundCueCursor());
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const visibility = () => setVisible(document.visibilityState === 'visible');
    visibility();
    document.addEventListener('visibilitychange', visibility);
    return () => {
      mounted.current = false;
      document.removeEventListener('visibilitychange', visibility);
      audio.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (!enabled || !visible || link !== 'connected' || mode !== 'live') {
      cursor.current.reset();
      return;
    }
    const receive = () => {
      const cue = cursor.current.receive(projection, Date.now());
      if (cue && document.visibilityState === 'visible') audio.current?.play(cue);
    };
    receive();
    const { public: view, self } = projection;
    const deadline = view.turn?.deadlineAt;
    if (view.phase !== 'player_turn' || view.turn?.playerId !== self.playerId || deadline == null) return;
    const delay = deadline - Date.now() - (GAME_CONFIG.turnTimerSeconds - GAME_CONFIG.turnWarningSeconds) * 1000;
    if (delay <= 0) return;
    const timer = window.setTimeout(receive, Math.ceil(delay) + 1);
    return () => window.clearTimeout(timer);
  }, [projection, link, mode, enabled, visible]);

  const toggle = async () => {
    setBusy(true);
    if (enabled) {
      setEnabled(false);
      await audio.current?.mute();
    } else {
      audio.current ??= new GameAudio();
      const ready = await audio.current.enable();
      if (mounted.current) {
        setEnabled(ready);
        setUnavailable(!ready);
        if (ready) audio.current.play('activity');
      }
    }
    if (mounted.current) setBusy(false);
  };

  return <button type="button" className="player-sound" aria-pressed={enabled}
    disabled={busy} onClick={() => { void toggle(); }}
    title={unavailable ? 'Sound could not start. Tap to try again. The game still works without it.' : 'Quiet cues for your turn, new activity and 15 seconds remaining'}>
    {/* The label stays "Sound" and the speaker shows the state. A label that
        flipped between "Sound on" and "Sound off" read as either the state or
        the action, and players could not tell which. */}
    {unavailable ? 'Retry sound' : (
      <>
        <SpeakerMark on={enabled} />
        <span>Sound</span>
      </>
    )}
  </button>;
};
