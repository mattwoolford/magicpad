import socketio from 'socket.io-client';
import React from "react";

export const socket = socketio.connect(`wss://${process.env["REACT_APP_API_HOSTNAME"]}`);
export const SocketContext = React.createContext();
