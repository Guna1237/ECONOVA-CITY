import type { ReactElement } from 'react';
import { BREAKING_NEWS, POLICY_BY_ID } from '@econova/game-content';
import type { PlayerProjectionDto } from '@econova/contracts';
import './city-updates.css';

/** Persistent, in-flow information for games played without a projector. */
export const NewsMoment = ({ projection }: { readonly projection: PlayerProjectionDto }): ReactElement => {
  const view = projection.public;
  const news = BREAKING_NEWS.find(entry => entry.id === view.activeBreakingNewsId);
  const policies = view.activePolicyIds.flatMap(id => {
    const policy = POLICY_BY_ID.get(id);
    return policy ? [policy] : [];
  });
  const activity = [...(projection.self.activity ?? view.activity ?? [])].reverse();
  const latest = activity.find(item => item.title !== 'Your resources') ?? activity[0];
  return (
    <section className="city-updates" aria-label="City updates">
      <details>
        <summary>
          <span className="city-updates__heading">City updates</span>
          <span className="city-updates__preview">
            {policies.length ? policies.map(policy => policy.name).join(', ') : 'No policies yet'}
            {news ? ` · ${news.name}` : ' · News and receipts'}
          </span>
          <span className="city-updates__toggle" aria-hidden="true">⌄</span>
        </summary>
        <div className="city-updates__content">
          <div className="city-updates__rules">
            <div><h3>Current news</h3>{news ? <><strong>{news.name}</strong><p>{news.description}</p></> : <p>No news is active.</p>}</div>
            <div><h3>Active policies</h3>{policies.length ? policies.map(policy => (
              <div key={policy.id}><strong>{policy.name}</strong><p>{policy.description}</p></div>
            )) : <p>No policy has passed yet. Council votes happen in Rounds 3 and 6.</p>}</div>
          </div>
          <h3>Recent activity</h3>
          <p className="city-updates__privacy">Your payments and trades are visible only to the players involved.</p>
          {activity.length ? <ol className="city-updates__history">{activity.map(item => (
            <li key={item.id}><span className="city-updates__round">R{item.round}</span><div><strong>{item.title}</strong><p>{item.text}</p></div></li>
          ))}</ol> : <p>Rent, trade results and game updates will appear here.</p>}
        </div>
      </details>
      <p className="city-updates__latest" role="status" aria-live="polite" aria-atomic="true">
        <span key={latest?.id ?? 'empty'}>{latest ? <><strong>{latest.title}</strong> {latest.text}</> : 'Keep this panel handy. Everything you need is on your phone.'}</span>
      </p>
    </section>
  );
};
