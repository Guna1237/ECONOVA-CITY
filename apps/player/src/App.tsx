import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';

import { BREAKING_NEWS, POLICY_BY_ID } from '@econova/game-content';
import {
  Button,
  GameBoard,
  Interrupt,
  RoundTransition,
  Sheet,
  Toasts
} from '@econova/ui';

import { ActionDock, type PanelId } from './components/ActionDock.js';
import { DecisionSurface, TradeProposal } from './components/decisions/index.js';
import { FinalResults } from './components/FinalResults.js';
import { JoinRoom } from './components/JoinRoom.js';
import { Lobby } from './components/Lobby.js';
import { NewsMoment } from './components/NewsMoment.js';
import {
  CardsPanel,
  HoldingsPanel,
  ObjectivePanel,
  PropertyPanel,
  RosterPanel
} from './components/Panels.js';
import { StatusRail } from './components/StatusRail.js';
import {
  PlayerSessionProvider,
  readStoredSession,
  usePlayerSession,
  type JoinedSession
} from './state/PlayerSession.js';
import { useWideLayout } from './state/useWideLayout.js';

import '@econova/ui/tokens.css';
import './app.css';

const PANEL_TITLE: Record<Exclude<PanelId, null>, string> = {
  holdings: 'Your holdings',
  cards: 'Strategy cards',
  objective: 'Secret objective',
  roster: 'At the table'
};

const Table = (): ReactElement => {
  const { projection, lobby, mode, link, fatal, toasts, dismissToast, signOut } =
    usePlayerSession();
  const { public: view, self } = projection;

  const [panel, setPanel] = useState<PanelId>(null);
  const [inspecting, setInspecting] = useState<string | null>(null);
  const [proposing, setProposing] = useState(false);
  const wide = useWideLayout();

  /* A round change is announced once, briefly. */
  const [announcedRound, setAnnouncedRound] = useState<number | null>(null);
  const lastRound = useRef(view.round);
  useEffect(() => {
    if (view.round === lastRound.current) return;
    lastRound.current = view.round;
    setAnnouncedRound(view.round);
  }, [view.round]);

  const news =
    view.activeBreakingNewsId === null
      ? null
      : BREAKING_NEWS.find((entry) => entry.id === view.activeBreakingNewsId) ?? null;

  const policies = view.activePolicyIds
    .map((policyId) => POLICY_BY_ID.get(policyId))
    .filter((policy) => policy !== undefined);

  const inspect = (propertyId: string) => {
    setPanel(null);
    setInspecting(propertyId);
  };

  if (lobby !== null) {
    return <Lobby lobby={lobby} selfPlayerId={self.playerId} />;
  }

  if (view.phase === 'completed' && view.results.length > 0) {
    return <FinalResults />;
  }

  return (
    <div className="player-shell">
      <StatusRail />

      <div className="player-notice">
        {fatal !== null ? (
          <Interrupt
            severity="fatal"
            action={
              <Button tone="quiet" size="sm" onClick={signOut}>
                Rejoin
              </Button>
            }
          >
            {fatal}
          </Interrupt>
        ) : mode === 'demonstration' ? (
          <Interrupt>Demonstration board — not a live room.</Interrupt>
        ) : link === 'reconnecting' || link === 'offline' ? (
          <Interrupt>
            {link === 'offline' ? 'Offline' : 'Reconnecting'} — showing the last
            state the city confirmed. Actions are paused.
          </Interrupt>
        ) : view.phase === 'paused' ? (
          <Interrupt>The game is paused by the operator.</Interrupt>
        ) : null}
      </div>

      <main className="player-stage">
        <div className="player-stage__wrap">
          <div className="player-stage__board">
            <GameBoard
              state={view}
              selectedPropertyId={inspecting}
              onSelectSpace={(space) =>
                space.type === 'property' ? inspect(space.propertyId) : undefined
              }
            />
          </div>
        </div>
        <NewsMoment eventId={view.activeBreakingNewsId} demand={view.demand} />
      </main>

      <ActionDock
        panel={panel}
        onPanel={setPanel}
        onInspectSpace={inspect}
        onTrade={() => setProposing(true)}
        wide={wide}
      />

      {inspecting === null ? null : (
        <Sheet
          title="Property record"
          kicker="City register"
          onClose={() => setInspecting(null)}
        >
          <PropertyPanel propertyId={inspecting} onClose={() => setInspecting(null)} />
        </Sheet>
      )}

      {panel === null || wide ? null : (
        <Sheet title={PANEL_TITLE[panel]} onClose={() => setPanel(null)}>
          {panel === 'holdings' ? <HoldingsPanel onInspect={inspect} /> : null}
          {panel === 'cards' ? <CardsPanel /> : null}
          {panel === 'objective' ? <ObjectivePanel /> : null}
          {panel === 'roster' ? (
            <>
              <RosterPanel />
              {news === null && policies.length === 0 ? null : (
                <div style={{ marginTop: 'var(--s4)', display: 'grid', gap: 'var(--s2)' }}>
                  <div className="eco-label">In force</div>
                  {news === null ? null : (
                    <div className="eco-event" data-tier="important">
                      <div>
                        <div className="eco-event__kicker">Breaking news</div>
                        <div className="eco-event__headline">{news.name}</div>
                        <div className="eco-event__body">{news.description}</div>
                      </div>
                    </div>
                  )}
                  {policies.map((policy) => (
                    <div key={policy?.id} className="eco-event">
                      <div>
                        <div className="eco-event__kicker">Policy</div>
                        <div className="eco-event__headline">{policy?.name}</div>
                        <div className="eco-event__body">{policy?.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </Sheet>
      )}

      {proposing ? <TradeProposal onClose={() => setProposing(false)} /> : null}

      <DecisionSurface />

      {announcedRound === null ? null : (
        <RoundTransition round={announcedRound} onDone={() => setAnnouncedRound(null)} />
      )}

      <Toasts items={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export const App = (): ReactElement => {
  const [session, setSession] = useState<JoinedSession | null>(() => readStoredSession());
  const [demonstration, setDemonstration] = useState(false);

  if (session === null && !demonstration) {
    return (
      <JoinRoom onJoined={setSession} onDemonstration={() => setDemonstration(true)} />
    );
  }

  return (
    <PlayerSessionProvider
      session={session}
      onSignOut={() => {
        setSession(null);
        setDemonstration(false);
      }}
    >
      <Table />
    </PlayerSessionProvider>
  );
};

export default App;
