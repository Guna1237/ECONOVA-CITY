import { EconovaApi, ApiError, secureId } from '@econova/client-core';
import { adminCommandSchema, type AdminCommand } from '@econova/contracts';
const API_BASE = import.meta.env['VITE_API_BASE'] ?? '';
export const api = () => new EconovaApi({ baseUrl: API_BASE });
export { ApiError as OperationError };
export const signIn = (accessKey: string) => api().loginAdmin(accessKey);
export const createRoom = (token: string, code: string) => api().createRoom(token, { code });
export const initializeRoom = (token: string, roomId: string) => api().initializeRoom(token, roomId);
type WithoutEnvelope<T> = T extends unknown ? Omit<T, 'requestId' | 'actionId' | 'expectedStateVersion'> : never;
export type AdminCommandInput = WithoutEnvelope<AdminCommand>;
export interface CommandOutcome { readonly status: 'accepted' | 'rejected'; readonly detail: string; readonly stateVersion: number }
export const sendCommand = async (token: string, roomId: string, command: AdminCommandInput, expectedStateVersion: number): Promise<CommandOutcome> => {
  const receipt = await api().adminCommand(token, roomId, adminCommandSchema.parse({ ...command, requestId: secureId(), actionId: secureId(), expectedStateVersion }));
  return { status: receipt.status, stateVersion: receipt.stateVersion, detail: receipt.status === 'accepted' ? `Committed at state version ${receipt.stateVersion}` : `${receipt.code} — ${receipt.message}` };
};
