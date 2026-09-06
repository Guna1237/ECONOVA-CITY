import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';

import { BREAKING_NEWS } from '@econova/game-content';
import type { DistrictId } from '@econova/game-content';
import type { PublicProjectionDto } from '@econova/contracts';
import { DISTRICTS, DistrictMark, formatSigned } from '@econova/ui';

type Demand = PublicProjectionDto['demand'];

/**
 * A bulletin entering the board — a newsroom moment, not a modal.
 *
 * It names the district it hits, states the consequence in the content
 * package's own words, and where the city's demand actually moved it shows
 * the change that followed. The before value is the last demand this client
 * was told about, so the readout narrates observed authoritative state rather
 * than predicting an outcome.
 */
export const NewsMoment = ({
  eventId,
  demand
}: {
  readonly eventId: string | null;
  readonly demand: Demand;
}): ReactElement | null => {
  const [showing, setShowing] = useState<string | null>(null);
  const [change, setChange] = useState<{ before: number; after: number } | null>(null);

  const lastEvent = useRef<string | null>(eventId);
  const previousDemand = useRef<Demand>(demand);

  useEffect(() => {
    if (eventId === lastEvent.current) {
      previousDemand.current = demand;
      return;
    }
    lastEvent.current = eventId;
    if (eventId === null) return;

    const news = BREAKING_NEWS.find((entry) => entry.id === eventId);
    const districtId = (news?.effect as { district?: DistrictId } | undefined)?.district;
    setChange(
      districtId === undefined
        ? null
        : { before: previousDemand.current[districtId], after: demand[districtId] }
    );
    previousDemand.current = demand;

    setShowing(eventId);
    const timer = window.setTimeout(() => setShowing(null), 5200);
    return () => window.clearTimeout(timer);
  }, [eventId, demand]);

  if (showing === null) return null;

  const news = BREAKING_NEWS.find((entry) => entry.id === showing);
  if (news === undefined) return null;

  /* Several bulletins name a district; the ones that do get its colour. */
  const districtId = (news.effect as { district?: DistrictId }).district ?? null;
  const district = districtId === null ? null : DISTRICTS[districtId];
  const moved = change !== null && change.before !== change.after;

  return (
    <div
      className="news-moment"
      role="status"
      style={(district?.vars ?? {}) as CSSProperties}
      data-district={districtId ?? 'none'}
    >
      <div className="news-moment__rule" aria-hidden="true" />
      <div className="news-moment__body">
        <div className="news-moment__kicker">
          Breaking news
          {district === null ? null : (
            <>
              <span aria-hidden="true">·</span>
              <DistrictMark mark={district.mark} width={13} height={13} />
              {district.label}
            </>
          )}
        </div>
        <div className="news-moment__headline">{news.name}</div>
        <div className="news-moment__text">{news.description}</div>

        {moved && district !== null ? (
          <div className="news-moment__change">
            <span className="news-moment__change-label">{district.label} demand</span>
            <span className="news-moment__from">{formatSigned(change.before)}</span>
            <span className="news-moment__arrow" aria-hidden="true">
              →
            </span>
            <span className="news-moment__to">{formatSigned(change.after)}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
};
