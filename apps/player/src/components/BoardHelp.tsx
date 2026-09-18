import type { ReactElement } from 'react';
import { BOARD_SPACES, GAME_CONFIG, type BoardSpace } from '@econova/game-content';
import { Button, NovaArt, Sheet, type NovaArtKind } from '@econova/ui';

export type BoardHelpTopic = Extract<BoardSpace, { type: 'special' }>['specialId'] | 'council';

interface HelpEntry {
  readonly art: NovaArtKind;
  readonly headline: string;
  readonly when: string;
  readonly next: string;
  readonly remember: string;
}

const eventHelp = {
  headline: 'Land here. Discover an event.',
  when: 'Landing here triggers one random Special Event. It might give you Credits, Influence, a card, or change the city economy.',
  next: 'Follow the prompt on your phone. Some events happen automatically; others need a choice. Then continue your turn.',
  remember: 'Tapping this space only explains it. You must land here to trigger an event.'
} as const;

// Plain-language presentation of GAME_DESIGN_SPEC sections 10, 21 and 23.
// Help has no session or command dependency and cannot trigger game effects.
export const BOARD_HELP: Readonly<Record<BoardHelpTopic, HelpEntry>> = {
  city_center: {
    art: 'civic',
    headline: `Collect ${GAME_CONFIG.cityCenterPassingBonus} Credits.`,
    when: 'Move forward past or onto City Center to collect the bonus, at most once per turn. Forward movement bonuses count too.',
    next: 'The game adds the Credits automatically. If you land here, continue to your remaining Actions.',
    remember: 'Moving backward with Shortcut gives no bonus. City Center does not trigger a Special Event.'
  },
  innovation_hub: { ...eventHelp, art: 'idea' },
  market_square: { ...eventHelp, art: 'market' },
  observatory: { ...eventHelp, art: 'event' },
  council: {
    art: 'council',
    headline: 'Help choose the city’s next rule.',
    when: 'City Council meets at the start of Rounds 3 and 6, after Breaking News and before anyone takes a turn. It is a vote, not a space you land on.',
    next: `Read the two policies on your phone. Spend Influence to vote: 1 Influence is 1 vote. You can split votes, keep some Influence, or abstain. You have up to ${GAME_CONFIG.councilTimerSeconds} seconds.`,
    remember: 'The most votes wins; a tie goes to Option A. Your allocation stays private from other players. Everyone sees the totals and the winning policy, which takes effect immediately.'
  }
};

export const boardHelpTitle = (topic: BoardHelpTopic): string => topic === 'council'
  ? 'City Council'
  : BOARD_SPACES.find((space) => space.type === 'special' && space.specialId === topic)!.name;

export const BoardHelpContent = ({ topic }: { readonly topic: BoardHelpTopic }): ReactElement => {
  const entry = BOARD_HELP[topic];
  return <div className="player-space-help">
    <div className="player-space-help__intro">
      <NovaArt kind={entry.art} />
      <h3>{entry.headline}</h3>
    </div>
    <p>{entry.when}</p>
    <h4>Your next step</h4>
    <p>{entry.next}</p>
    <p className="player-space-help__note">{entry.remember}</p>
  </div>;
};

export const BoardHelp = ({ topic, onClose }: {
  readonly topic: BoardHelpTopic;
  readonly onClose: () => void;
}): ReactElement => <Sheet title={boardHelpTitle(topic)} onClose={onClose}
  footer={<Button onClick={onClose}>Back to board</Button>}>
  <BoardHelpContent topic={topic} />
  <p className="player-help-clock" role="note">Reading help does not pause the game.</p>
</Sheet>;
