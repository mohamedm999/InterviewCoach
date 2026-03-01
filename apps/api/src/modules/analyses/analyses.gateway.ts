import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class AnalysesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(AnalysesGateway.name);

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    this.logger.log(`Client connected for real-time analysis: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-analysis-room')
  handleJoinRoom(
    @MessageBody() data: { analysisId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data?.analysisId) return;
    client.join(`analysis_${data.analysisId}`);
    this.logger.log(`Client ${client.id} joined room analysis_${data.analysisId}`);
  }

  // Called by the AnalysesService
  broadcastProgress(analysisId: string, progress: number, status: string) {
    this.server.to(`analysis_${analysisId}`).emit('analysis-progress', {
      progress,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  // Called by the AnalysesService when done
  broadcastComplete(analysisId: string) {
    this.server.to(`analysis_${analysisId}`).emit('analysis-complete', {
      analysisId,
      timestamp: new Date().toISOString(),
    });
  }
}
