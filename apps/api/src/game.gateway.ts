import { Logger } from '@nestjs/common';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomsService } from './rooms.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/game' })
export class GameGateway {
  private readonly logger = new Logger(GameGateway.name);
  @WebSocketServer() server!: Server;
  constructor(private readonly rooms: RoomsService) {}

  @SubscribeMessage('room:subscribe') subscribe(@ConnectedSocket() client: Socket, @MessageBody() body: { code: string; reconnectToken: string }) {
    try {
      const connection = this.rooms.reconnect(body.code, body.reconnectToken);
      client.data.code = connection.code; client.data.guestPublicId = connection.guestPublicId;
      client.join(connection.code);
      client.emit('room:updated', connection.summary);
      if (connection.view) client.emit('game:state', connection.view);
    } catch (error) { client.emit('game:error', { message: error instanceof Error ? error.message : 'Falha ao conectar' }); }
  }

  @SubscribeMessage('game:action') action(@ConnectedSocket() client: Socket, @MessageBody() action: Record<string, unknown>) {
    try {
      if (!client.data.code || client.data.guestPublicId !== action.playerId) throw new Error('Conexão não autorizada');
      const result = this.rooms.action(client.data.code, action as never);
      if (!result.duplicate) this.server.to(client.data.code).emit('game:event', result.event);
      Object.entries(result.views).forEach(([playerId, view]) => {
        this.server.sockets.sockets.forEach((socket) => {
          if (socket.data.code === client.data.code && socket.data.guestPublicId === playerId) socket.emit('game:state', view);
        });
      });
    } catch (error) { client.emit('game:error', { message: error instanceof Error ? error.message : 'Ação inválida' }); }
  }

  handleDisconnect(client: Socket) { if (client.data.code && client.data.guestPublicId) this.rooms.markDisconnected(client.data.code, client.data.guestPublicId); }
}
