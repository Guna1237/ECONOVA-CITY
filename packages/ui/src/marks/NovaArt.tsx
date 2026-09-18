import type { ReactElement } from 'react';
import pieces from '../assets/nova-pieces.webp';
import dice from '../assets/nova-dice.webp';
import property from '../assets/nova-property.webp';
import credits from '../assets/nova-credits.webp';
import influence from '../assets/nova-influence.webp';
import council from '../assets/nova-council.webp';
import guide from '../assets/nova-guide.webp';
import trophy from '../assets/nova-trophy.webp';
import civic from '../assets/nova-board-civic.webp';
import idea from '../assets/nova-board-idea.webp';
import market from '../assets/nova-board-market.webp';
import event from '../assets/nova-board-event.webp';

// Pixel-preserving extracts of the owner's Nova City illustration sheet.
// Decorative artwork never substitutes for an action's visible text label.
const art = {
  pieces: [pieces, 620, 174], dice: [dice, 289, 172],
  property: [property, 226, 167], credits: [credits, 105, 100],
  influence: [influence, 109, 87], council: [council, 143, 149],
  guide: [guide, 106, 138], trophy: [trophy, 102, 105],
  civic: [civic, 62, 69], idea: [idea, 36, 54],
  market: [market, 44, 45], event: [event, 62, 92]
} as const;

export type NovaArtKind = keyof typeof art;

export const NovaArt = ({ kind, className = '' }: {
  readonly kind: NovaArtKind;
  readonly className?: string;
}): ReactElement => {
  const [src, width, height] = art[kind];
  return <img src={src} width={width} height={height} alt="" aria-hidden="true"
    decoding="async" className={`eco-nova-art ${className}`} />;
};
