import { io } from 'socket.io-client';

let socketInstance = null;

export const getSocket = () => {
  if (!socketInstance) {
    const token = localStorage.getItem('token');
    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;

    socketInstance = io(socketUrl, {
      auth: { token },
      autoConnect: false,
    });
  }
  return socketInstance;
};

export const connectSocket = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;

  if (socketInstance && socketInstance.auth?.token !== token) {
    socketInstance.disconnect();
    socketInstance = null;
  }

  const socket = getSocket();
  socket.auth = { token };
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socketInstance) {
    if (socketInstance.connected) {
      socketInstance.disconnect();
    }
    socketInstance = null;
  }
};
