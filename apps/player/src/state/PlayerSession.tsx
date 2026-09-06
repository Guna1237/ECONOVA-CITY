import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import type { ReactElement, ReactNode } from 'react';

import type {
  ClientCommand,
  LobbyProjectionDto,
  PlayerProjectionDto
} from '@econova/contracts';
import { Button, Interrupt, type RequestState, type ToastItem } from '@econova/ui';
import { secureId } from '@econova/client-core';
import { Lobby } from '../components/Lobby.js';

import { demonstrationPlayerState } from '../fixtures/demonstrationState.js';
import {
  RoomLink,
  clearStoredSession,
  logout,
  readStoredSession,
  type JoinedSession,
  type LinkState
} from './transport.js';

/** A command as the interface expresses it, before the envelope is added. */
type WithoutEnvelope<T> = T extends unknown
  ? Omit<T, 'requestId' | 'actionId' | 'expectedStateVersion'>
  : never;

export type CommandInput = WithoutEnvelope<ClientCommand>;

export interface PlayerSessionValue {
  /** Demonstration renders canonical content but accepts no commands. */
  readonly mode: 'demonstration' | 'live';
  readonly projection: PlayerProjectionDto;
  /** Set while the room is still filling; the game has not started. */
  readonly lobby: LobbyProjectionDto | null;
  readonly link: LinkState;
  readonly fatal: string | null;
  readonly toasts: readonly ToastItem[];
  readonly dismissToast: (id: string) => void;
  /** The lifecycle of the most recent request under this key. */
  readonly requestState: (key: string) => RequestState;
  /** True when the server's capability list currently permits this command. */
  readonly can: (type: CommandInput['type']) => boolean;
  readonly dispatch: (key: string, command: CommandInput) => void;
  readonly signOut: () => void;
}

const PlayerSessionContext = createContext<PlayerSessionValue | null>(null);

const newId = secureId;

export const PlayerSessionProvider = ({
  session,
  onSignOut,
  children
}: {
  readonly session: JoinedSession | null;
  readonly onSignOut: () => void;
  readonly children: ReactNode;
}): ReactElement => {
  const [projection, setProjection] = useState<PlayerProjectionDto | null>(null);
  const [lobby, setLobby] = useState<LobbyProjectionDto | null>(null);
  const [link, setLink] = useState<LinkState>(session === null ? 'offline' : 'connecting');
  const [fatal, setFatal] = useState<string | null>(null);
  const [toasts, setToasts] = useState<readonly ToastItem[]>([]);
  const [requests, setRequests] = useState<Readonly<Record<string, RequestState>>>({});

  const [uncertain, setUncertain] = useState<readonly string[]>([]);
  const linkRef = useRef<RoomLink | null>(null);
  /** requestId → the UI key that started it, so the reply lands on the control. */
  const pending = useRef(new Map<string, string>());

  const pushToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = newId();
    setToasts((current) => [{ ...toast, id }, ...current].slice(0, 3));
    window.setTimeout(
      () => setToasts((current) => current.filter((item) => item.id !== id)),
      6000
    );
  }, []);

  const settle = useCallback((key: string, state: RequestState) => {
    setRequests((current) => ({ ...current, [key]: state }));
    if (state === 'committed' || state === 'rejected') {
      window.setTimeout(
        () => setRequests((current) => ({ ...current, [key]: 'idle' })),
        state === 'rejected' ? 2200 : 900
      );
    }
  }, []);

  useEffect(() => {
    if (session === null) return;

    const roomLink = new RoomLink(session, {
      onProjection: (next) => {
        setProjection(next);
        setLobby(null);
      },
      onLobby: (next) => setLobby(next),
      onLinkState: setLink,
      onCommand: (record) => {
        const key = pending.current.get(record.requestId);
        if (key === undefined) return;
        if (record.status === 'uncertain') {
          settle(key, 'idle');
          setUncertain(current => current.includes(record.requestId) ? current : [...current, record.requestId]);
          return;
        }
        settle(key, record.status);
        if (record.status === 'committed' || record.status === 'rejected') {
          pending.current.delete(record.requestId);
          setUncertain(current => current.filter(id => id !== record.requestId));
        }
        if (record.status === 'rejected') pushToast({ tone: 'error', title: 'The city refused that', text: record.message ?? 'Action rejected.' });
      },
      onFatal: (message) => setFatal(message)
    });

    linkRef.current = roomLink;
    roomLink.open();
    return () => {
      roomLink.close();
      linkRef.current = null;
    };
  }, [session, settle, pushToast]);

  const live = session !== null && projection !== null;
  const activeProjection = live ? (projection as PlayerProjectionDto) : demonstrationPlayerState;

  const dispatch = useCallback(
    (key: string, command: CommandInput) => {
      if (!live) {
        settle(key, 'rejected');
        pushToast({
          tone: 'warning',
          title: 'Demonstration board',
          text: 'Join a room to take actions. Nothing here changes the game.'
        });
        return;
      }

      settle(key, 'submitting');
      const requestId = linkRef.current?.send(command) ?? null;
      if (requestId !== null) pending.current.set(requestId, key);
      if (requestId === null) {
        settle(key, 'rejected');
        pushToast({
          tone: 'error',
          title: 'Not delivered',
          text: 'The link to the room is down. Your action was not sent.'
        });
      }
    },
    [live, activeProjection, settle, pushToast]
  );

  const signOut = useCallback(() => {
    linkRef.current?.close();
    clearStoredSession();
    onSignOut();
  }, [onSignOut, session]);

  const value = useMemo<PlayerSessionValue>(() => {
    const allowed = new Set<string>(activeProjection.self.capabilities.commandTypes);
    return {
      mode: live ? 'live' : 'demonstration',
      projection: activeProjection,
      lobby,
      link: session === null ? 'offline' : link,
      fatal,
      toasts,
      dismissToast: (id) => setToasts((current) => current.filter((t) => t.id !== id)),
      requestState: (key) => requests[key] ?? 'idle',
      can: (type) => live && link === 'connected' && uncertain.length === 0 && pending.current.size === 0 && allowed.has(type),
      dispatch,
      signOut
    };
  }, [live, activeProjection, lobby, session, link, fatal, toasts, requests, dispatch, signOut, uncertain]);

  return (
    <PlayerSessionContext.Provider value={value}>{children}</PlayerSessionContext.Provider>
  );
};

export const usePlayerSession = (): PlayerSessionValue => {
  const value = useContext(PlayerSessionContext);
  if (value === null) {
    throw new Error('usePlayerSession must be used inside PlayerSessionProvider.');
  }
  return value;
};

export { readStoredSession };
export type { JoinedSession, LinkState };
