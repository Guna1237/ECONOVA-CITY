import { useState } from 'react';
import type { FormEvent, ReactElement } from 'react';

import { Button, EconovaCrest, NovaArt } from '@econova/ui';
import { HowToPlay } from './HowToPlay.js';

import { joinRoom, type JoinedSession } from '../state/transport.js';

/**
 * Entering the game. Two fields, one action — a room code and a name, the
 * same two things you would say out loud walking up to the table.
 */
export const JoinRoom = ({
  onJoined,
  onDemonstration
}: {
  readonly onJoined: (session: JoinedSession) => void;
  readonly onDemonstration: () => void;
}): ReactElement => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      onJoined(await joinRoom(code.trim().toUpperCase(), name.trim()));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not join that room.');
    } finally {
      setBusy(false);
    }
  };

  const ready = /^[A-Za-z0-9]{6}$/.test(code.trim()) && name.trim().length > 0;

  return (
    <div className="player-join">
      <section className="player-welcome" aria-labelledby="welcome-title">
        <div className="player-welcome__brand"><EconovaCrest size={64} withWordmark /><HowToPlay /></div>
        <p className="player-welcome__edition">ECONOVA: CITY</p>
        <h1 id="welcome-title">Build your city.<br /><span>Make your move.</span></h1>
        <p className="player-welcome__intro">Buy properties. Shape the market. Build the highest score in eight rounds.</p>
        <NovaArt kind="pieces" className="player-welcome__pieces" />
        <div className="player-welcome__facts"><span>4 to 6 players</span><span>8 rounds</span><span>One shared city</span></div>
      </section>
      <form className="player-join__panel" onSubmit={submit}>
        <div className="player-join__heading"><NovaArt kind="property" /><div><p className="eco-label">Ready to play?</p><h2>Join your room</h2></div></div>
        <p className="player-join__intro">Ask your organizer for the room code. Your name will appear on the shared board.</p>

        <label className="player-field">
          <span className="eco-label">Room code</span>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="6 characters"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            name="roomCode"
            maxLength={6}
            inputMode="text"
            aria-invalid={code.length > 0 && !/^[A-Za-z0-9]{6}$/.test(code)}
          />
        </label>

        <label className="player-field">
          <span className="eco-label">Your name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="As it appears on the board"
            autoComplete="nickname"
            name="playerName"
            maxLength={40}
            style={{ fontFamily: 'var(--font-ui)', letterSpacing: 'normal' }}
          />
        </label>

        {error === null ? null : (
          <p
            role="alert"
            style={{
              marginTop: 'var(--s3)',
              color: 'var(--signal-loss)',
              fontSize: 'var(--type-small)'
            }}
          >
            {error}
          </p>
        )}

        <div style={{ display: 'grid', gap: 'var(--s2)', marginTop: 'var(--s5)' }}>
          <Button
            tone="primary"
            block
            type="submit"
            disabled={!ready}
            request={busy ? 'submitting' : 'idle'}
          >
            Join room
          </Button>
          <Button tone="quiet" block onClick={onDemonstration}>
            Preview the board
          </Button>
        </div>
        <div className="player-join__help"><HowToPlay /><span>New here? Start with the basics.</span></div>
      </form>
    </div>
  );
};
