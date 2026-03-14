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
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import appConfig from '../../config/app.config';

@WebSocketGateway({
  cors: {
    origin: appConfig().cors.origins,
    credentials: true,
  },
})
export class AnalysesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(AnalysesGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  private parseTokenFromCookies(cookieHeader?: string): string | undefined {
    if (!cookieHeader) return undefined;
    const match = cookieHeader
      .split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith('accessToken='));
    if (!match) return undefined;
    return decodeURIComponent(match.split('=')[1]);
  }

  private verifyToken(client: Socket): boolean {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '') ||
        this.parseTokenFromCookies(client.handshake.headers?.cookie as string);
      if (!token) return false;
      this.jwtService.verify(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });
      return true;
    } catch {
      return false;
    }
  }

  handleConnection(client: Socket) {
    if (!this.verifyToken(client)) {
      client.disconnect(true);
      return;
    }
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
    if (!this.verifyToken(client)) {
      client.disconnect(true);
      return;
    }
    client.join(`analysis_${data.analysisId}`);
    this.logger.log(
      `Client ${client.id} joined room analysis_${data.analysisId}`,
    );
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
