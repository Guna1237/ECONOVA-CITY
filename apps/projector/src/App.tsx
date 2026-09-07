import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';

import {
  BREAKING_NEWS,
  GAME_CONFIG,
  OBJECTIVE_BY_ID,
  POLICY_BY_ID,
  PROPERTY_BY_ID
} from '@econova/game-content';
import type { PublicProjectionDto, LobbyProjectionDto } from '@econova/contracts';
import {
  GameBoard,
  Button,
  PHASE_LABEL,
  RoundTransition,
  Timer,
  formatCredits,
  seatOf
} from '@econova/ui';

import { Standings } from './components/Standings.js';
import { narrate } from './narration.js';
import { demonstrationPublicState } from './demonstrationState.js';
import { authorizeProjector, openProjectorLink, type ProjectorLinkState } from './link.js';

import '@econova/ui/tokens.css';
import './projector.css';

/* -----------------------------------------------------------------
 * The ticker: what just happened, in the room's own words.
 * -------------------------------------------------------------- */

const describe = (
  announcement: PublicProjectionDto['announcements'][number]
): ReactElement | null => {
  const payload = announcement.payload;
  const read = (key: string): string => String(payload[key] ?? '');

  switch (announcement.type) {
    case 'breaking_news': {
      const news = BREAKING_NEWS.find((entry) => entry.id === read('eventId'));
      return news === undefined ? null : (
        <span>
          <b>{news.name}</b> — {news.description}
        </span>
      );
    }
    case 'council_resolved': {
      const policy = POLICY_BY_ID.get(read('policyId'));
      return policy === undefined ? null : (
        <span>
          Council adopted <b>{policy.name}</b> — {policy.description}
        </span>
      );
    }
    case 'property_purchased': {
      const property = PROPERTY_BY_ID.get(read('propertyId'));
      return property === undefined ? null : (
        <span>
          <b>{property.name}</b> changed hands
        </span>
      );
    }
    case 'property_developed': {
      const property = PROPERTY_BY_ID.get(read('propertyId'));
      return property === undefined ? null : (
        <span>
          <b>{property.name}</b> developed to level {read('level')}
        </span>
      );
    }
    default:
      return null;
  }
};

/* -----------------------------------------------------------------
 * Final results — the payoff screen.
 * -------------------------------------------------------------- */

const Results = ({ state }: { readonly state: PublicProjectionDto }): ReactElement => (
  <div className="cast-body" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
    <div className="cast-rail" style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
      <div className="cast-rail__title">Final standings</div>
      {[...state.results]
        .sort((a, b) => a.rank - b.rank)
        .map((result) => {
          const player = state.players.find(
            (entry) => entry.playerId === result.playerId
          );
          const seat = seatOf(result.playerId, state.turnOrder);
          const objective = OBJECTIVE_BY_ID.get(result.objectiveId);

          return (
            <div
              key={result.playerId}
              className="cast-result"
              data-rank={result.rank}
              style={{ '--seat': seat.color } as CSSProperties}
            >
              <span className="cast-result__rank">{result.rank}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="cast-standing__name">{player?.name ?? '—'}</div>
                <div className="eco-label" style={{ marginTop: 4 }}>
                  {formatCredits(result.breakdown.credits)} credits ·{' '}
                  {formatCredits(result.breakdown.propertyValue)} property ·{' '}
                  {formatCredits(result.breakdown.districtControl)} districts ·{' '}
                  {formatCredits(result.breakdown.influence)} influence
                  {result.objectiveCompleted
                    ? ` · ${objective?.name ?? 'objective'} achieved`
                    : ''}
                </div>
              </div>
              <span className="cast-result__score">
                {formatCredits(result.breakdown.total)}
              </span>
            </div>
          );
        })}
    </div>
  </div>
);

/* -----------------------------------------------------------------
 * The broadcast
 * -------------------------------------------------------------- */

export const App = (): ReactElement => {
  const [state, setState] = useState<PublicProjectionDto | null>(null);
  const [link, setLink] = useState<ProjectorLinkState>('connecting');
  const [announcedRound, setAnnouncedRound] = useState<number | null>(null);
  const [lobby, setLobby] = useState<LobbyProjectionDto | null>(null);
  const [code, setCode] = useState(() => new URLSearchParams(window.location.search).get('room') ?? '');
  const [accessKey, setAccessKey] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [generation, setGeneration] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => openProjectorLink({ onState: next => { setState(next); setLobby(null); }, onLobby: setLobby, onLinkState: setLink }), [generation]);

  const live = state !== null;
  const view = state ?? demonstrationPublicState;

  const lastRound = useRef(view.round);
  useEffect(() => {
    if (view.round === lastRound.current) return;
    lastRound.current = view.round;
    setAnnouncedRound(view.round);
  }, [view.round]);

  if ((!live && link !== 'demonstration') || link === 'authorization_required') {
    return (
      <div className="cast-lobby" data-surface="projector">
        <div>
          <div className="cast-lobby__mark">
            Econova
            <span>City</span>
          </div>
          <p style={{ marginTop: 'var(--s5)', color: 'var(--ink-soft)' }}>
            {link === 'error'
              ? 'This projector is not authorised for a room.'
              : 'Waiting for the room to open.'}
          </p>
          {lobby === null ? null : <p>Room {lobby.code}: {lobby.players.map(player => player.name).join(', ')}. Waiting for initialization.</p>}
          {link === 'authorization_required' ? <form onSubmit={event => {
            event.preventDefault(); setBusy(true); setAuthError(null); setState(null); setLobby(null);
            const credential = accessKey; setAccessKey('');
            void authorizeProjector(code, credential).then(() => setGeneration(value => value + 1)).catch(error => setAuthError(error instanceof Error ? error.message : 'Authorization failed.')).finally(() => setBusy(false));
          }} className="cast-connect">
            <label className="cast-connect__field">
              <span className="eco-label">Room code</span>
              <input aria-label="Room code" value={code} maxLength={6} placeholder="6 characters" onChange={event => setCode(event.target.value.toUpperCase())} />
            </label>
            <label className="cast-connect__field">
              <span className="eco-label">Projector access key</span>
              <input aria-label="Projector access key" type="password" autoComplete="off" value={accessKey} onChange={event => setAccessKey(event.target.value)} />
            </label>
            <Button tone="primary" block type="submit" request={busy ? 'submitting' : 'idle'} disabled={code.length !== 6 || accessKey.length === 0}>Connect projector</Button>
            {authError === null ? null : <p className="cast-connect__error" role="alert">{authError}</p>}
          </form> : null}
        </div>
      </div>
    );
  }

  const current =
    view.turn === null
      ? null
      : view.players.find((player) => player.playerId === view.turn?.playerId) ?? null;
  const seat = current === null ? null : seatOf(current.playerId, view.turnOrder);

  const news =
    view.activeBreakingNewsId === null
      ? null
      : BREAKING_NEWS.find((entry) => entry.id === view.activeBreakingNewsId) ?? null;
  const policies = view.activePolicyIds
    .map((policyId) => POLICY_BY_ID.get(policyId))
    .filter((policy) => policy !== undefined);

  const ticker = view.announcements.map(describe).filter((item) => item !== null);

  return (
    <div className="cast" data-surface="projector">
      {view.phase === 'completed' && view.results.length > 0 ? (
        <Results state={view} />
      ) : (
        <div className="cast-body">
          <div className="cast-stage">
            <div className="cast-stage__board">
              <GameBoard state={view} />
            </div>
          </div>

          {/* The broadcast panel: identity, the moment, the table, what is in
              force. Kept in one column so the board can own the full height. */}
          <aside className="cast-rail">
            <div className="cast-rail__brand">
              <span className="cast-head__mark">
                Econova <em>City</em>
              </span>
              <div className="cast-round">
                <b>
                  Round {view.round}
                  <span>/{GAME_CONFIG.rounds}</span>
                </b>
                {view.phase === 'player_turn' ? null : (
                  <span className="cast-round__phase">
                    {PHASE_LABEL[view.phase] ?? view.phase}
                  </span>
                )}
              </div>
            </div>

            {current === null ? null : (
              <div
                className="cast-turn"
                style={{ '--seat': seat?.color ?? 'var(--brass)' } as CSSProperties}
              >
                <span className="cast-turn__label">Now playing</span>
                <span className="cast-turn__name">{current.name}</span>
                {narrate(view) === null ? null : (
                  <span className="cast-turn__doing">{narrate(view)}</span>
                )}
                {view.turn?.deadlineAt != null && view.phase === 'player_turn' ? (
                  <Timer
                    deadlineAt={view.turn.deadlineAt}
                    windowSeconds={GAME_CONFIG.turnTimerSeconds}
                  />
                ) : null}
              </div>
            )}

            <div className="cast-rail__group">
              <div className="cast-rail__title">At the table</div>
              <Standings state={view} />
            </div>

            {news === null && policies.length === 0 ? null : (
              <div className="cast-force">
                <div className="cast-rail__title">In force</div>
                {news === null ? null : (
                  <div className="eco-event" data-tier="major">
                    <div>
                      <div className="eco-event__kicker">Breaking news</div>
                      <div className="eco-event__headline">{news.name}</div>
                      <div className="eco-event__body">{news.description}</div>
                    </div>
                  </div>
                )}
                {policies.map((policy) => (
                  <div key={policy?.id} className="eco-event" data-tier="important">
                    <div>
                      <div className="eco-event__kicker">City policy</div>
                      <div className="eco-event__headline">{policy?.name}</div>
                      <div className="eco-event__body">{policy?.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      )}

      <footer className="cast-ticker">
        <span className="cast-ticker__label">
          {live ? `Room ${view.roomId}` : 'Demonstration'}
        </span>
        <div className="cast-ticker__items">
          {ticker.length === 0 ? (
            <span>The city is quiet.</span>
          ) : (
            ticker.map((item, index) => <span key={index}>{item}</span>)
          )}
        </div>
      </footer>

      {announcedRound === null ? null : (
        <RoundTransition round={announcedRound} onDone={() => setAnnouncedRound(null)} />
      )}
    </div>
  );
};

export default App;
