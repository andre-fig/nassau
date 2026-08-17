import { Injectable, NotFoundException } from '@nestjs/common';
import { Action, applyAction, createGame, GameState, getPlayerView, PlayerView } from '@nassau/game-engine';
import { createHash, randomBytes, randomUUID } from 'node:crypto';

type Seat = { seatNumber: 0 | 1; guestPublicId: string; displayName: string; reconnectTokenHash: string; connected: boolean };
type Room = { id: string; code: string; createdAt: Date; expiresAt: Date; status: 'waiting' | 'playing' | 'finished'; seats: Seat[]; game?: GameState; processedActionIds: Set<string> };

@Injectable()
export class RoomsService {
  private readonly rooms = new Map<string, Room>();
  private readonly codeIndex = new Map<string, string>();

  create(displayName: string, guestPublicId: string, publicWebUrl = process.env.PUBLIC_WEB_URL ?? 'http://localhost:8081') {
    const code = this.newCode();
    const token = this.newToken();
    const room: Room = { id: randomUUID(), code, createdAt: new Date(), expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 12), status: 'waiting', seats: [{ seatNumber: 0, guestPublicId, displayName, reconnectTokenHash: this.hash(token), connected: true }], processedActionIds: new Set() };
    this.rooms.set(room.id, room); this.codeIndex.set(code, room.id);
    return { code, roomId: room.id, reconnectToken: token, inviteUrl: `${publicWebUrl.replace(/\/$/, '')}/join/${code}`, summary: this.summary(room, publicWebUrl) };
  }

  join(code: string, displayName: string, guestPublicId: string) {
    const room = this.getRoom(code);
    const existing = room.seats.find((seat) => seat.guestPublicId === guestPublicId);
    if (existing) return { ...this.credentials(room, existing), summary: this.summary(room), view: room.game ? getPlayerView(room.game, existing.guestPublicId) : undefined };
    if (room.seats.length >= 2) throw new Error('Sala cheia');
    const token = this.newToken();
    const seat: Seat = { seatNumber: 1, guestPublicId, displayName, reconnectTokenHash: this.hash(token), connected: true };
    room.seats.push(seat);
    room.status = 'playing';
    room.game = createGame({ gameId: room.id, players: room.seats.map((current) => ({ id: current.guestPublicId, displayName: current.displayName })) }, Date.now());
    return { ...this.credentials(room, seat, token), summary: this.summary(room), view: getPlayerView(room.game, seat.guestPublicId) };
  }

  reconnect(code: string, token: string) {
    const room = this.getRoom(code);
    const seat = room.seats.find((candidate) => candidate.reconnectTokenHash === this.hash(token));
    if (!seat) throw new Error('Reconnect token inválido');
    seat.connected = true;
    return { ...this.credentials(room, seat), summary: this.summary(room), view: room.game ? getPlayerView(room.game, seat.guestPublicId) : undefined };
  }

  get(code: string) { const room = this.getRoom(code); return this.summary(room); }
  markDisconnected(code: string, guestPublicId: string) { const room = this.getRoom(code); const seat = room.seats.find((candidate) => candidate.guestPublicId === guestPublicId); if (seat) seat.connected = false; }

  action(code: string, action: Action) {
    const room = this.getRoom(code);
    if (!room.game) throw new Error('A partida ainda não começou');
    if (action.clientActionId && room.processedActionIds.has(action.clientActionId)) return { duplicate: true, views: this.views(room) };
    if (action.expectedVersion !== undefined && action.expectedVersion !== room.game.turn) throw new Error('Versão da partida desatualizada');
    const seat = room.seats.find((candidate) => candidate.guestPublicId === action.playerId);
    if (!seat) throw new Error('Jogador não pertence à sala');
    const result = applyAction(room.game, action);
    room.game = result.state;
    if (action.clientActionId) room.processedActionIds.add(action.clientActionId);
    if (room.game.phase === 'finished') room.status = 'finished';
    return { duplicate: false, event: result.event, views: this.views(room) };
  }

  viewsFor(code: string) { const room = this.getRoom(code); return this.views(room); }
  private views(room: Room): Record<string, PlayerView | undefined> { return Object.fromEntries(room.seats.map((seat) => [seat.guestPublicId, room.game ? getPlayerView(room.game, seat.guestPublicId) : undefined])); }
  private credentials(room: Room, seat: Seat, reconnectToken?: string) { return { code: room.code, roomId: room.id, seatNumber: seat.seatNumber, guestPublicId: seat.guestPublicId, ...(reconnectToken ? { reconnectToken } : {}) }; }
  private summary(room: Room, publicWebUrl = process.env.PUBLIC_WEB_URL ?? 'http://localhost:8081') { return { code: room.code, status: room.status, expiresAt: room.expiresAt, seats: room.seats.map((seat) => ({ seatNumber: seat.seatNumber, displayName: seat.displayName, connected: seat.connected })), inviteUrl: `${publicWebUrl.replace(/\/$/, '')}/join/${room.code}` }; }
  private getRoom(code: string) { const room = this.rooms.get(this.codeIndex.get(code.toUpperCase()) ?? ''); if (!room || room.expiresAt.getTime() < Date.now()) throw new NotFoundException('Sala não encontrada ou expirada'); return room; }
  private newCode() { let code = ''; do code = randomBytes(4).toString('base64url').slice(0, 6).toUpperCase(); while (this.codeIndex.has(code)); return code; }
  private newToken() { return randomBytes(32).toString('base64url'); }
  private hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
}
