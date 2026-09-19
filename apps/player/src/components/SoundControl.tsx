import { useEffect, useRef, useState, type ReactElement } from 'react';
import { GAME_CONFIG } from '@econova/game-content';
import { Button, Sheet } from '@econova/ui';
import { usePlayerSession } from '../state/PlayerSession.js';
import { GameAudio, SoundCueCursor, type SoundVolume } from '../state/sound.js';

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
  const [open, setOpen] = useState(false);
  const [volume, setVolume] = useState<SoundVolume>('quiet');
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
      audio.current.setVolume(volume);
      const ready = await audio.current.enable();
      if (mounted.current) {
        setEnabled(ready);
        setUnavailable(!ready);
        if (ready) audio.current.play('turn');
      }
    }
    if (mounted.current) setBusy(false);
  };

  return <>
    <button type="button" className="player-sound" data-enabled={enabled}
      aria-label={`Sound settings, ${enabled ? 'on' : 'off'}`} aria-haspopup="dialog"
      onClick={() => setOpen(true)}>
        <SpeakerMark on={enabled} />
        <span>Sound</span>
    </button>
    {open ? <Sheet title="Game sounds" onClose={() => setOpen(false)}
      footer={<Button onClick={() => setOpen(false)}>Done</Button>}>
      <div className="player-audio-settings">
        <p>Short, gentle cues for your turn, payments, trades and city updates. One reminder when you have 15 seconds left. No background music.</p>
        <Button tone={enabled ? 'default' : 'primary'} disabled={busy}
          onClick={() => { void toggle(); }}>
          {busy ? 'Updating sound…' : enabled ? 'Turn sound off' : unavailable ? 'Try sound again' : 'Turn sound on'}
        </Button>
        {unavailable ? <p role="status">Sound could not start. Try again, or keep playing without it.</p> : null}
        <fieldset>
          <legend>Volume</legend>
          <div className="player-audio-settings__levels">
            {(['quiet', 'standard'] as const).map(level => <button type="button" key={level}
              aria-pressed={volume === level} onClick={() => {
                setVolume(level);
                audio.current?.setVolume(level);
              }}>{level === 'quiet' ? 'Quiet' : 'Standard'}</button>)}
          </div>
        </fieldset>
        <Button disabled={!enabled || busy} onClick={() => audio.current?.play('turn')}>Preview turn sound</Button>
        <p className="player-audio-settings__note">Every sound also has an on-screen update. Your game keeps running while this panel is open.</p>
      </div>
    </Sheet> : null}
  </>;
};
