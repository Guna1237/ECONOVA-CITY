import { EconovaApi, RoomClient, readStoredSession as readCoreSession, clearStoredSession as clearCoreSession, saveStoredSession, type CommandInput, type CommandRecord, type RoomClientState } from '@econova/client-core';
import type { LobbyProjectionDto, PlayerProjectionDto } from '@econova/contracts';

export type LinkState = 'connected' | 'connecting' | 'reconnecting' | 'offline' | 'error';
export interface JoinedSession { readonly token: string; readonly roomId: string; readonly playerId: string; readonly expiresAt: number }
const API_BASE = import.meta.env['VITE_API_BASE'] ?? '';
const api = () => new EconovaApi({ baseUrl: API_BASE });
export const readStoredSession = (): JoinedSession | null => {
  const stored = readCoreSession(API_BASE, 'player');
  if (stored?.session.role !== 'player') return null;
  const { token, roomId, playerId, expiresAt } = stored.session;
  return { token, roomId, playerId, expiresAt };
};
export const clearStoredSession = (): void => clearCoreSession(API_BASE, 'player');
export class JoinError extends Error {}
export const joinRoom = async (code: string, name: string): Promise<JoinedSession> => {
  try {
    const session = await api().joinRoom(code, name);
    saveStoredSession(API_BASE, { ...session, role: 'player' });
    return session;
  } catch (error) { throw new JoinError(error instanceof Error ? error.message : 'Unable to join this room.'); }
};
export const logout = async (session: JoinedSession): Promise<void> => { await api().logout(session.token); };

export interface LinkHandlers {
  readonly onProjection: (projection: PlayerProjectionDto, version: number) => void;
  readonly onLobby: (projection: LobbyProjectionDto) => void;
  readonly onLinkState: (state: LinkState) => void;
  readonly onCommand: (record: CommandRecord) => void;
  readonly onFatal: (message: string) => void;
}
export class RoomLink {
  private readonly client: RoomClient;
  private unsubscribe: (() => void) | null = null;
  private previous: RoomClientState | null = null;
  constructor(session: JoinedSession, private readonly handlers: LinkHandlers) {
    this.client = new RoomClient({ apiBaseUrl: API_BASE, session: { ...session, role: 'player' }, persistSession: true });
  }
  open(): void {
    this.unsubscribe = this.client.subscribe(() => queueMicrotask(() => { if (this.unsubscribe !== null) this.notify(); }));
    this.client.open();
  }
  private notify(): void {
    const state = this.client.getState();
    const previous = this.previous;
    this.previous = state;
    if (state.status !== previous?.status) {
      this.handlers.onLinkState(state.status === 'synchronized' ? 'connected' : state.status === 'offline' ? 'offline' : state.status === 'reconnecting' ? 'reconnecting' : ['idle', 'connecting', 'authenticating'].includes(state.status) ? 'connecting' : 'error');
      if (['expired', 'denied', 'unavailable', 'replaced', 'fatal'].includes(state.status)) this.handlers.onFatal(state.error?.message ?? 'This session is no longer available.');
    }
    if (state.snapshot !== previous?.snapshot) {
      const snapshot = state.snapshot;
      if (snapshot?.type === 'state_snapshot' && snapshot.audience === 'player') this.handlers.onProjection(snapshot.projection, snapshot.stateVersion);
      if (snapshot?.type === 'lobby_snapshot' && snapshot.audience === 'player') this.handlers.onLobby(snapshot.projection);
    }
    for (const record of Object.values(state.commands)) if (record !== previous?.commands[record.requestId]) this.handlers.onCommand(record);
  }
  send(command: CommandInput): string | null { return this.client.dispatch(command)?.requestId ?? null; }
  dismiss(requestId: string): void { this.client.dismissCommand(requestId); }
  close(): void { this.unsubscribe?.(); this.unsubscribe = null; this.client.close(); }
}
