import { io } from 'socket.io-client';

// Dynamically connect to the local Vite proxy or the same-domain production server
const socketURL = import.meta.env.DEV ? 'http://localhost:3001' : '/';
export const socket = io(socketURL);
