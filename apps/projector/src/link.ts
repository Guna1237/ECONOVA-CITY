import { EconovaApi, RoomClient, readStoredSession, saveStoredSession } from '@econova/client-core';
import type { PublicProjectionDto, LobbyProjectionDto } from '@econova/contracts';
export type ProjectorLinkState = 'connecting' | 'connected' | 'reconnecting' | 'error' | 'demonstration' | 'authorization_required';
const API_BASE = import.meta.env['VITE_API_BASE'] ?? '';
export interface ProjectorHandlers {
  readonly onState: (state: PublicProjectionDto) => void;
  readonly onLobby?: (state: LobbyProjectionDto) => void;
  readonly onLinkState: (state: ProjectorLinkState) => void;
}
export async function authorizeProjector(code: string, accessKey: string): Promise<void> {
  const session = await new EconovaApi({ baseUrl: API_BASE }).createProjectorSession(code, accessKey);
  saveStoredSession(API_BASE, { ...session, role: 'projector' });
}
export const openProjectorLink = (handlers: ProjectorHandlers): (() => void) => {
  const url = new URL(window.location.href);
  if (url.searchParams.has('key')) { url.searchParams.delete('key'); window.history.replaceState(null, '', url); }
  const stored = readStoredSession(API_BASE, 'projector');
  if (stored === null) {
    handlers.onLinkState(import.meta.env.DEV && url.searchParams.get('demo') === '1' ? 'demonstration' : 'authorization_required');
    return () => undefined;
  }
  const client = new RoomClient({ apiBaseUrl: API_BASE, session: stored.session, lastSeenStateVersion: stored.lastSeenStateVersion, persistSession: true });
  let previous: ReturnType<RoomClient['getState']> | null = null;
  const unsubscribe = client.subscribe(() => {
    const state = client.getState();
    if (state.status !== previous?.status) handlers.onLinkState(state.status === 'synchronized' ? 'connected' : ['idle', 'connecting', 'authenticating'].includes(state.status) ? 'connecting' : ['reconnecting', 'offline'].includes(state.status) ? 'reconnecting' : ['expired', 'denied', 'replaced'].includes(state.status) ? 'authorization_required' : 'error');
    if (state.snapshot !== previous?.snapshot) {
      if (state.snapshot?.type === 'state_snapshot' && state.snapshot.audience === 'projector') handlers.onState(state.snapshot.projection);
      if (state.snapshot?.type === 'lobby_snapshot' && state.snapshot.audience === 'projector') handlers.onLobby?.(state.snapshot.projection);
    }
    previous = state;
  });
  client.open();
  return () => { unsubscribe(); client.close(); };
};
