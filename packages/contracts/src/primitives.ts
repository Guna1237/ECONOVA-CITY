import { z } from "zod";

export const identifierSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/);

export const requestIdSchema = identifierSchema.brand<"RequestId">();
export const actionIdSchema = identifierSchema.brand<"ActionId">();
export const roomIdSchema = identifierSchema.brand<"RoomId">();
export const playerIdSchema = identifierSchema.brand<"PlayerId">();
export const propertyIdSchema = identifierSchema.brand<"PropertyId">();
export const cardIdSchema = identifierSchema.brand<"CardId">();
export const auctionIdSchema = identifierSchema.brand<"AuctionId">();
export const tradeIdSchema = identifierSchema.brand<"TradeId">();
export const objectiveIdSchema = identifierSchema.brand<"ObjectiveId">();
export const districtIdSchema = z.enum(["food", "tech", "entertainment", "mobility"]);

export const roomCodeSchema = z.string().regex(/^[A-Za-z0-9]{6}$/);
export const accessKeySchema = z.string().min(1).max(512);
export const sessionTokenSchema = z.string().min(32).max(512);
export const displayNameSchema = z.string().trim().min(1).max(40);

export type RequestId = z.infer<typeof requestIdSchema>;
export type ActionId = z.infer<typeof actionIdSchema>;
export type RoomId = z.infer<typeof roomIdSchema>;
export type PlayerId = z.infer<typeof playerIdSchema>;
export type PropertyId = z.infer<typeof propertyIdSchema>;
export type CardId = z.infer<typeof cardIdSchema>;
export type ObjectiveId = z.infer<typeof objectiveIdSchema>;
export type DistrictId = z.infer<typeof districtIdSchema>;
