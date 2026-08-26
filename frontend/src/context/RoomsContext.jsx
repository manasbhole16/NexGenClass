import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import API_BASE_URL from '../apiConfig';
import { useSocket } from './SocketContext';

const RoomsContext = createContext(null);

export const RoomsProvider = ({ user, children }) => {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const socket = useSocket();

    const fetchRooms = useCallback(async (force = false) => {
        if (!user?._id) {
            setRooms([]);
            setLoading(false);
            setLoaded(false);
            return;
        }

        // If already loading or loaded and not forced, return cached rooms
        if (!force && loaded) {
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/rooms/my-rooms`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setRooms(data.rooms || []);
            }
        } catch (err) {
            console.error("Failed to fetch classrooms", err);
        } finally {
            setLoading(false);
            setLoaded(true);
        }
    }, [user?._id, loaded]);

    // Initial fetch when user logs in
    useEffect(() => {
        if (user?._id) {
            fetchRooms(true);
        } else {
            setRooms([]);
            setLoaded(false);
        }
    }, [user?._id]);

    // Listen to real-time classroom updates via shared socket
    useEffect(() => {
        if (!socket) return;

        const handleRoomUpdated = (updatedRoom) => {
            if (!updatedRoom?._id) return;
            setRooms(prev => prev.map(r => r._id === updatedRoom._id ? { ...r, ...updatedRoom } : r));
        };

        const handleRoomDeleted = ({ roomId }) => {
            setRooms(prev => prev.filter(r => r._id !== roomId));
        };

        const handleTaskCreated = () => {
            // Background refresh to update upcoming task badge if needed
            fetchRooms(true);
        };

        socket.on('classroom_updated', handleRoomUpdated);
        socket.on('classroom_deleted', handleRoomDeleted);
        socket.on('taskCreated', handleTaskCreated);

        return () => {
            socket.off('classroom_updated', handleRoomUpdated);
            socket.off('classroom_deleted', handleRoomDeleted);
            socket.off('taskCreated', handleTaskCreated);
        };
    }, [socket, fetchRooms]);

    const addRoom = useCallback((newRoom) => {
        setRooms(prev => {
            if (prev.find(r => r._id === newRoom._id)) return prev;
            return [newRoom, ...prev];
        });
    }, []);

    const updateRoom = useCallback((updatedRoom) => {
        setRooms(prev => prev.map(r => r._id === updatedRoom._id ? { ...r, ...updatedRoom } : r));
    }, []);

    const removeRoom = useCallback((roomId) => {
        setRooms(prev => prev.filter(r => r._id !== roomId));
    }, []);

    return (
        <RoomsContext.Provider value={{
            rooms,
            loading,
            loaded,
            fetchRooms,
            addRoom,
            updateRoom,
            removeRoom
        }}>
            {children}
        </RoomsContext.Provider>
    );
};

export const useRooms = () => {
    const context = useContext(RoomsContext);
    if (!context) {
        throw new Error('useRooms must be used within a RoomsProvider');
    }
    return context;
};

export default RoomsContext;
