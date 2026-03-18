import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ namespace: '/events', cors: { origin: '*', credentials: true } })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) { this.logger.log(`Client connected: ${client.id}`); }
  handleDisconnect(client: Socket) { this.logger.log(`Client disconnected: ${client.id}`); }

  emitToOrg(orgId: string, event: string, data: any) {
    this.server.to(`org:${orgId}`).emit(event, data);
  }
}
