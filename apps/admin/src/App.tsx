import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';

import { RoomClient, secureId, type RoomClientState } from '@econova/client-core';
import type { RoomSummaryDto, PrivateInspectionProjectionDto } from '@econova/contracts';
import { Button, type RequestState } from '@econova/ui';

import {
  OperationError,
  api,
  createRoom,
  initializeRoom,
  sendCommand,
  signIn,
  type AdminCommandInput
} from './operations.js';

import '@econova/ui/tokens.css';
import './console.css';

interface LogEntry {
  readonly id: string;
  readonly at: string;
  readonly status: 'sending' | 'accepted' | 'rejected';
  readonly label: string;
  readonly detail: string;
}

const clock = (): string =>
  new Date().toLocaleTimeString('en-GB', { hour12: false });

/* -----------------------------------------------------------------
 * Sign in
 * -------------------------------------------------------------- */

const SignIn = ({
  onToken
}: {
  readonly onToken: (token: string) => void;
}): ReactElement => {
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onToken((await signIn(key)).token);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ops-signin" data-surface="admin">
      <form className="ops-signin__panel" onSubmit={submit}>
        <div className="ops-head__mark">Econova Operations</div>
        <p className="ops-card__note" style={{ marginTop: 'var(--s2)' }}>
          Operator console. Sign in with the event access key.
        </p>
        <label className="ops-field" style={{ marginTop: 'var(--s4)' }}>
          <span className="eco-label">Access key</span>
          <input
            type="password"
            value={key}
            onChange={(event) => setKey(event.target.value)}
            autoComplete="off"
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
        <div style={{ marginTop: 'var(--s4)' }}>
          <Button
            tone="primary"
            block
            type="submit"
            disabled={key.length === 0}
            request={busy ? 'submitting' : 'idle'}
          >
            Sign in
          </Button>
        </div>
      </form>
    </div>
  );
};

/* -----------------------------------------------------------------
 * Console
 * -------------------------------------------------------------- */

const Console = ({ token, onSignOut }: { readonly token: string; readonly onSignOut: () => void }): ReactElement => {
  const [code, setCode] = useState('');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [stateVersion, setStateVersion] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [log, setLog] = useState<readonly LogEntry[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const busyRef = useRef(false);
  const [rooms, setRooms] = useState<readonly RoomSummaryDto[]>([]);
  const [live, setLive] = useState<RoomClientState | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [requiredVersion, setRequiredVersion] = useState<number | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [privateKey, setPrivateKey] = useState('');
  const [inspection, setInspection] = useState<PrivateInspectionProjectionDto | null>(null);
  const [inspectionError, setInspectionError] = useState<string | null>(null);
  const realtimeRef = useRef<RoomClient | null>(null);
  const roomToken = useRef<string | null>(null);
  useEffect(() => {
    let active = true;
    void api().listRooms(token).then(result => { if (active) setRooms(result.rooms); }).catch(error => { if (active) setLinkError(error instanceof Error ? error.message : 'Room list unavailable.'); });
    return () => { active = false; };
  }, [token]);
  useEffect(() => {
    let active = true; let client: RoomClient | null = null; let unsubscribe: (() => void) | undefined;
    setLive(null); setStateVersion(null); setGameId(null); setInspection(null); setPrivateKey(''); setLinkError(null); setRequiredVersion(null); setUncertain(false);
    roomToken.current = null;
    if (roomId !== null) void api().createAdminRealtimeSession(token, roomId).then(session => {
      if (!active) return;
      roomToken.current = session.token;
      client = new RoomClient({ apiBaseUrl: api().baseUrl, session: { ...session, role: 'admin' } });
      realtimeRef.current = client;
      unsubscribe = client.subscribe(() => {
        if (!active || client === null) return;
        const state = client.getState(); setLive(state);
        if (state.status !== 'synchronized') setInspection(null);
        if (state.snapshot?.type === 'state_snapshot' && state.snapshot.audience === 'admin') {
          setStateVersion(state.snapshot.stateVersion); setGameId(state.snapshot.projection.public.gameId);
        }
      });
      client.open();
    }).catch(error => { if (active) setLinkError(error instanceof Error ? error.message : 'Room connection failed.'); });
    return () => { active = false; unsubscribe?.(); client?.close(); realtimeRef.current = null; roomToken.current = null; };
  }, [roomId, token]);
  useEffect(() => {
    if (inspection === null) return;
    const hide = () => setInspection(null);
    const timer = window.setTimeout(hide, 30_000);
    window.addEventListener('blur', hide);
    return () => { window.clearTimeout(timer); window.removeEventListener('blur', hide); };
  }, [inspection]);

  const record = useCallback((entry: LogEntry) => {
    setLog((current) => [entry, ...current].slice(0, 40));
  }, []);

  const run = useCallback(
    async (label: string, task: () => Promise<{ status: LogEntry['status']; detail: string }>) => {
      if (busyRef.current) return;
      busyRef.current = true;
      const id = secureId();
      setBusy(label);
      record({ id, at: clock(), status: 'sending', label, detail: 'sent to server' });
      try {
        const outcome = await task();
        setLog((current) =>
          current.map((entry) => (entry.id === id ? { ...entry, ...outcome } : entry))
        );
      } catch (cause) {
        const detail =
          cause instanceof OperationError
            ? `${cause.code} — ${cause.message}`
            : cause instanceof Error
              ? cause.message
              : 'unknown failure';
        setLog((current) =>
          current.map((entry) =>
            entry.id === id ? { ...entry, status: 'rejected', detail } : entry
          )
        );
      } finally {
        busyRef.current = false;
        setBusy(null);
      }
    },
    [record]
  );

  const requestState = (label: string): RequestState =>
    busy === label ? 'submitting' : 'idle';

  const command = (label: string, input: AdminCommandInput) =>
    run(label, async () => {
      const state = realtimeRef.current?.getState();
      if (roomId === null || state?.status !== 'synchronized' || state.stateVersion === null) throw new OperationError('NOT_SYNCHRONIZED', 'Wait for the room snapshot.');
      try {
        const outcome = await sendCommand(token, roomId, input, state.stateVersion);
        setRequiredVersion(outcome.stateVersion);
        return outcome;
      } catch (error) {
        setUncertain(true);
        throw new Error('Command outcome uncertain. Review the current room state before sending another command.');
      }
    });

  const reasoned = reason.trim();
  const ready = roomId !== null && live?.status === 'synchronized' && stateVersion !== null && (requiredVersion === null || stateVersion >= requiredVersion) && !uncertain && busy === null;
  const needsReason = reasoned.length === 0;

  return (
    <div className="ops" data-surface="admin">
      <header className="ops-head">
        <span className="ops-head__mark">Econova Operations</span>
        <span className="ops-head__role">admin</span>
        <Button size="sm" disabled={busy !== null} onClick={() => { void api().logout(token).finally(onSignOut).catch(() => undefined); }}>Sign out</Button>
        <span style={{ marginLeft: 'auto' }} className="ops-card__note">
          {roomId === null ? 'No room selected' : `Room ${roomCode ?? roomId}`}
        </span>
      </header>

      <div className="ops-body">
        {/* ---- room lifecycle ---- */}
        <section className="ops-card">
          <h2 className="ops-card__title">Room</h2>
          <label className="ops-field"><span className="eco-label">Existing rooms</span><select aria-label="Existing rooms" value={roomId ?? ''} disabled={busy !== null} onChange={event => { const room = rooms.find(entry => entry.roomId === event.target.value); setRoomId(room?.roomId ?? null); setRoomCode(room?.code ?? null); }}>
            <option value="">Select a room</option>{rooms.map(room => <option key={room.roomId} value={room.roomId}>{room.code}</option>)}
          </select></label>
          <p role="status">{linkError ?? live?.error?.message ?? live?.status ?? 'Select or create a room.'}</p>
          {uncertain ? <div role="alert">Command outcome uncertain. Check the current state before retrying.<Button disabled={live?.status !== 'synchronized'} onClick={() => setUncertain(false)}>I reviewed the current state</Button></div> : null}

          <label className="ops-field">
            <span className="eco-label">Room code — six letters or digits</span>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              maxLength={6}
              autoComplete="off"
            />
          </label>

          <div className="ops-row">
            <Button
              size="sm"
              request={requestState('create')}
              disabled={busy !== null || !/^[A-Za-z0-9]{6}$/.test(code)}
              onClick={() =>
                void run('create', async () => {
                  const created = await createRoom(token, code);
                  setRooms(current => [...current, { ...created, playerCount: 0, status: 'lobby', stateVersion: null }]);
                  setRoomId(created.roomId);
                  setRoomCode(created.code);
                  return { status: 'accepted', detail: `room ${created.roomId} created` };
                })
              }
            >
              Create room
            </Button>

            <Button
              size="sm"
              tone="primary"
              request={requestState('initialize')}
              disabled={roomId === null || busy !== null || live?.snapshot?.type !== 'lobby_snapshot'}
              onClick={() =>
                void run('initialize', async () => {
                  if (roomId === null) throw new OperationError('NO_ROOM', 'No room.');
                  const initialized = await initializeRoom(token, roomId);
                  setGameId(initialized.gameId);
                  setStateVersion(initialized.stateVersion);
                  return {
                    status: 'accepted',
                    detail: `game ${initialized.gameId} at version ${initialized.stateVersion}`
                  };
                })
              }
            >
              Initialize game
            </Button>
          </div>

          <div className="ops-value">
            <span className="eco-label">Room id</span>
            <b>{roomId ?? '—'}</b>
          </div>
          <div className="ops-value">
            <span className="eco-label">Join code</span>
            <b>{roomCode ?? '—'}</b>
          </div>
          <div className="ops-value">
            <span className="eco-label">Game id</span>
            <b>{gameId ?? '—'}</b>
          </div>
          <div className="ops-value">
            <span className="eco-label">State version</span>
            <b>{stateVersion ?? '—'}</b>
          </div>
        </section>

        {/* ---- run control ---- */}
        <section className="ops-card">
          <h2 className="ops-card__title">Run control</h2>
          <p className="ops-card__note">
            Every control here sends one admin command and reports the server's
            own answer. Pause, skip and end require a reason, which is recorded
            with the command.
          </p>

          <label className="ops-field">
            <span className="eco-label">Reason — required for pause, skip and end</span>
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={240}
              placeholder="e.g. fire alarm"
              style={{ fontFamily: 'var(--font-ui)' }}
            />
          </label>

          <div className="ops-row">
            <Button
              size="sm"
              tone="commit"
              disabled={!ready}
              request={requestState('start')}
              onClick={() => void command('start', { type: 'admin_start_game' })}
            >
              Start game
            </Button>
            <Button
              size="sm"
              disabled={!ready || needsReason}
              request={requestState('pause')}
              onClick={() =>
                void command('pause', { type: 'admin_pause_game', reason: reasoned })
              }
            >
              Pause
            </Button>
            <Button
              size="sm"
              disabled={!ready}
              request={requestState('resume')}
              onClick={() => void command('resume', { type: 'admin_resume_game' })}
            >
              Resume
            </Button>
            <Button
              size="sm"
              disabled
              request={requestState('skip')}
              onClick={() =>
                void command('skip', { type: 'admin_skip_turn', reason: reasoned })
              }
            >
              Skip turn
            </Button>
            <Button
              size="sm"
              tone="risk"
              disabled
              request={requestState('end')}
              onClick={() =>
                void command('end', { type: 'admin_end_game', reason: reasoned })
              }
            >
              End game
            </Button>
          </div>
        </section>

        {/* ---- what this console cannot do ---- */}
        <section className="ops-card ops-card--wide">
          <h2 className="ops-card__title">Live room state</h2>
          {live?.snapshot?.type === 'lobby_snapshot' ? <p>{live.snapshot.projection.players.map(player => player.name).join(', ') || 'Waiting for players.'}</p> : null}
          {live?.snapshot?.type === 'state_snapshot' && live.snapshot.audience === 'admin' ? <>
            <p>Round {live.snapshot.projection.public.round} · {live.snapshot.projection.public.phase}</p>
            {live.snapshot.projection.players.map(player => <div className="ops-value" key={player.playerId}><span>{player.name}</span><b>{player.connected ? 'Connected' : 'Disconnected'}</b></div>)}
          </> : null}
          <h3>Protected private inspection</h3>
          <p className="ops-card__note">Separate audited access. Re-enter the operator key for each inspection. Private data disappears on blur, room switch, or after 30 seconds.</p>
          <form onSubmit={event => {
            event.preventDefault();
            const selectedRoom = roomId; const scopedToken = roomToken.current; const key = privateKey;
            setPrivateKey(''); setInspection(null); setInspectionError(null);
            if (selectedRoom === null || scopedToken === null || busyRef.current) return;
            void run('inspect', async () => {
              const result = await api().inspectPrivate(scopedToken, selectedRoom, key, reasoned, secureId());
              if (roomToken.current === scopedToken && realtimeRef.current?.getState().status === 'synchronized' && document.hasFocus()) setInspection(result);
              return { status: 'accepted', detail: 'Private inspection audited.' };
            });
          }}>
            <label className="ops-field"><span className="eco-label">Re-authenticate for private inspection</span><input type="password" autoComplete="off" value={privateKey} onChange={event => setPrivateKey(event.target.value)} /></label>
            <Button type="submit" disabled={!ready || privateKey.length === 0 || needsReason}>Inspect private state</Button>
          </form>
          {inspectionError === null ? null : <p role="alert">{inspectionError}</p>}
          {inspection === null ? null : <div data-private-inspection="true">
            <Button onClick={() => setInspection(null)}>Hide private state</Button>
            {inspection.players.map(player => <div className="ops-value" key={player.playerId}><span>{player.name}</span><b>Cards: {player.cards.join(', ')} · Objective: {player.objectiveId ?? 'Choosing'}</b></div>)}
            <p>Sealed bids: {JSON.stringify(inspection.auction?.bids ?? {})}</p>
            <p>Unrevealed Council allocations: {JSON.stringify(inspection.council?.allocations ?? {})}</p>
          </div>}
        </section>

        {/* ---- command log ---- */}
        <section className="ops-card ops-card--wide">
          <h2 className="ops-card__title">Command log</h2>
          {log.length === 0 ? (
            <p className="ops-card__note">Nothing sent yet.</p>
          ) : (
            <div className="ops-log">
              {log.map((entry) => (
                <div key={entry.id} className="ops-log__entry" data-status={entry.status}>
                  <span className="ops-log__time">{entry.at}</span>
                  <span className="ops-log__status">{entry.status}</span>
                  <span className="ops-log__detail">
                    {entry.label} · {entry.detail}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export const App = (): ReactElement => {
  const [token, setToken] = useState<string | null>(null);
  return token === null ? <SignIn onToken={setToken} /> : <Console token={token} onSignOut={() => setToken(null)} />;
};

export default App;
