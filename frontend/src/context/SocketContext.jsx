import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import API_BASE_URL from '../apiConfig';

const SocketContext = createContext(null);

export const SocketProvider = ({ user, children }) => {
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        if (!user?._id) {
            if (socket) {
                socket.disconnect();
                setSocket(null);
            }
            return;
        }

        // Initialize single shared socket instance
        const serverUrl = API_BASE_URL.replace('/api', '');
        const newSocket = io(serverUrl, {
            withCredentials: true,
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        newSocket.on('connect', () => {
            // Join user-specific personal notification and event rooms
            newSocket.emit('joinUser', { userId: user._id });
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [user?._id]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    return useContext(SocketContext);
};

export default SocketContext;
