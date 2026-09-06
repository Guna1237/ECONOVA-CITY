import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';

import { BREAKING_NEWS } from '@econova/game-content';
import type { DistrictId } from '@econova/game-content';
import { DISTRICTS, DistrictMark } from '@econova/ui';

/**
 * A bulletin entering the board — a newsroom moment, not a modal. It names
 * the district it hits, states the mechanical consequence in the content
 * package's own words, and leaves on its own so play resumes.
 */
export const NewsMoment = ({
  eventId
}: {
  readonly eventId: string | null;
}): ReactElement | null => {
  const [showing, setShowing] = useState<string | null>(null);
  const last = useRef<string | null>(eventId);

  useEffect(() => {
    if (eventId === last.current) return;
    last.current = eventId;
    if (eventId === null) return;
    setShowing(eventId);
    const timer = window.setTimeout(() => setShowing(null), 4200);
    return () => window.clearTimeout(timer);
  }, [eventId]);

  if (showing === null) return null;

  const news = BREAKING_NEWS.find((entry) => entry.id === showing);
  if (news === undefined) return null;

  /* Several bulletins name a district; the ones that do get its colour. */
  const districtId = (news.effect as { district?: DistrictId }).district ?? null;
  const district = districtId === null ? null : DISTRICTS[districtId];

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
      </div>
    </div>
  );
};
