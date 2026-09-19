import { useState } from 'react';
import type { ReactElement } from 'react';

import { BREAKING_NEWS, POLICY_BY_ID, PROPERTY_BY_ID } from '@econova/game-content';
import {
  Button,
  GameBoard,
  Interrupt,
  NovaArt,
  Sheet,
  Toasts
} from '@econova/ui';

import { ActionDock, type PanelId } from './components/ActionDock.js';
import { BoardHelp, type BoardHelpTopic } from './components/BoardHelp.js';
import { DecisionSurface, InfluenceAction, TradeProposal } from './components/decisions/index.js';
import { FinalResults } from './components/FinalResults.js';
import { JoinRoom } from './components/JoinRoom.js';
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
import { briefFor } from './state/briefing.js';

import '@econova/ui/tokens.css';
import './app.css';

const PANEL_TITLE: Record<Exclude<PanelId, null>, string> = {
  holdings: 'Your properties',
  cards: 'Strategy cards',
  objective: 'Secret objective',
  roster: 'Players'
};

const Table = (): ReactElement => {
  const { projection, mode, link, fatal, toasts, dismissToast, signOut, hasUncertainCommand, reviewCurrentState } =
    usePlayerSession();
  const { public: view } = projection;

  const [panel, setPanel] = useState<PanelId>(null);
  const [inspecting, setInspecting] = useState<string | null>(null);
  const [boardHelp, setBoardHelp] = useState<BoardHelpTopic | null>(null);
  const [proposing, setProposing] = useState(false);
  const [influencing, setInfluencing] = useState(false);
  const wide = useWideLayout();
  const briefing = briefFor(projection);

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
          <Interrupt action={<Button tone="quiet" size="sm" onClick={signOut}>Return to join</Button>}>Board preview. Explore the spaces; actions are disabled.</Interrupt>
        ) : link !== 'connected' ? (
          <Interrupt>
            {link === 'offline' ? 'You are offline.' : 'Reconnecting.'} Showing your last saved game state. Wait for the connection before taking another action.
          </Interrupt>
        ) : hasUncertainCommand ? (
          <Interrupt action={<Button tone="quiet" size="sm" onClick={reviewCurrentState}>I reviewed the current state</Button>}>
            We could not confirm your last action. Check the updated board and your resources before continuing. Your action was not sent again.
          </Interrupt>
        ) : view.phase === 'paused' ? (
          <Interrupt>The game is paused by the operator.</Interrupt>
        ) : null}
        <NewsMoment projection={projection} />
      </div>

      <main className="player-stage" id="city-board" tabIndex={-1} aria-label="City board">
        <div className="player-board-tools">
          <a className="player-next-step" href="#player-actions">
            <span className="player-next-step__mobile">↑ Your actions</span>
            <span className="player-next-step__desktop">Your next step</span>
            <strong className="player-next-step__desktop">{fatal !== null || (mode === 'live' && link !== 'connected') ? 'Wait for connection' : briefing.headline}</strong>
          </a>
          <button type="button" className="player-board-tools__council"
            aria-haspopup="dialog" onClick={() => setBoardHelp('council')}>
            <NovaArt kind="council" /> City Council <span aria-hidden="true">?</span>
          </button>
        </div>
        <div className="player-stage__wrap">
          <div className="player-stage__board">
            <GameBoard
              state={view}
              selectedPropertyId={inspecting}
              onSelectSpace={(space) =>
                space.type === 'property' ? inspect(space.propertyId) : setBoardHelp(space.specialId)
              }
            />
          </div>
        </div>
        <p className="player-board-caption">Tap any space for details. Pawns show players; numbered badges show owners.</p>
      </main>

      <ActionDock
        panel={panel}
        onPanel={setPanel}
        onInspectSpace={inspect}
        onTrade={() => setProposing(true)}
        onInfluence={() => setInfluencing(true)}
        wide={wide}
      />

      {boardHelp === null ? null : <BoardHelp topic={boardHelp} onClose={() => setBoardHelp(null)} />}

      {inspecting === null ? null : (
        <Sheet
          title={PROPERTY_BY_ID.get(inspecting)?.name ?? 'Property details'}
          kicker="Property details"
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

      {proposing && !hasUncertainCommand ? <TradeProposal onClose={() => setProposing(false)} /> : null}

      {influencing && !hasUncertainCommand ? (
        <InfluenceAction onClose={() => setInfluencing(false)} />
      ) : null}

      {hasUncertainCommand ? null : <DecisionSurface />}

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
