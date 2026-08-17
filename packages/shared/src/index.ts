export * from '@nassau/game-engine';

export type GuestProfile = { guestId: string; displayName: string; musicEnabled: boolean; soundEffectsEnabled: boolean; tutorialEnabled: boolean };
export type RoomStatus = 'waiting' | 'ready' | 'playing' | 'finished';
export type RoomSeat = { seatNumber: 0 | 1; guestPublicId: string; displayName: string; reconnectToken: string; connected: boolean };
export type RoomSummary = { code: string; status: RoomStatus; seats: Array<Pick<RoomSeat, 'seatNumber' | 'displayName' | 'connected'>>; inviteUrl: string };

export const createGuestProfile = (): GuestProfile => ({ guestId: crypto.randomUUID(), displayName: `Capitão ${Math.floor(1000 + Math.random() * 9000)}`, musicEnabled: true, soundEffectsEnabled: true, tutorialEnabled: true });
