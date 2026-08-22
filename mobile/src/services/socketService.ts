import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../constants/config';
import { storageService } from './storageService';

class MobileSocketService {
  private socket: Socket | null = null;

  async connect(): Promise<Socket> {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    const token = await storageService.getToken();
    const user = await storageService.getUser();

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: { token },
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      if (user?._id) {
        this.socket?.emit('joinUser', { userId: user._id });
      }
    });

    return this.socket;
  }

  joinRoom(roomId: string, user: any): void {
    if (!this.socket || !roomId) return;
    this.socket.emit('joinRoom', {
      roomId,
      userId: user?._id,
      fullname: user?.fullname,
    });
  }

  leaveRoom(roomId: string, user: any): void {
    if (!this.socket || !roomId) return;
    this.socket.emit('leaveRoom', {
      roomId,
      userId: user?._id,
      fullname: user?.fullname,
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketService = new MobileSocketService();
