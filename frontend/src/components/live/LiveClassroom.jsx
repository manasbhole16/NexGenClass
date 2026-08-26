import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Video, VideoOff, Mic, MicOff, MonitorUp, MonitorOff,
    Hand, MessageSquare, Users, PenTool, PhoneOff, Settings,
    Sparkles, ShieldCheck, Download, Trash2, Plus, CheckCircle,
    Clock, AlertCircle, Play, Square, Loader2, Radio
} from 'lucide-react';
import { io } from 'socket.io-client';
import API_BASE_URL from '../../apiConfig';
import Whiteboard from './Whiteboard';
import LiveScheduleModal from './LiveScheduleModal';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

const LiveClassroom = ({ roomId, user, isTeacher }) => {
    const [session, setSession] = useState(null);
    const [sessionsHistory, setSessionsHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [inLiveSession, setInLiveSession] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);

    // Media & WebRTC states
    const [localStream, setLocalStream] = useState(null);
    const [isMicOn, setIsMicOn] = useState(true);
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [peers, setPeers] = useState({}); // userId -> { stream, fullname, role, peerConnection }

    // Classroom interactive modes
    const [activeView, setActiveView] = useState('video'); // 'video' | 'whiteboard'
    const [activeSidebar, setActiveSidebar] = useState('chat'); // 'chat' | 'participants' | 'none'
    const [handRaised, setHandRaised] = useState(false);
    const [raisedHandsList, setRaisedHandsList] = useState([]);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [studentsCanDraw, setStudentsCanDraw] = useState(true);

    // Recording states
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);

    // Sockets & Refs
    const socket = useSocket();
    const socketRef = useRef(null);
    const localVideoRef = useRef(null);
    const peerConnectionsRef = useRef({}); // userId -> RTCPeerConnection
    const screenStreamRef = useRef(null);

    // Fetch current classroom live session
    const fetchCurrentSession = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/api/live-sessions/rooms/${roomId}/current`, { credentials: 'include' });
            const data = await res.json();
            if (res.ok) {
                setSession(data.session);
            }
            // Fetch past session history
            const histRes = await fetch(`${API_BASE_URL}/api/live-sessions/rooms/${roomId}/history`, { credentials: 'include' });
            const histData = await histRes.json();
            if (histRes.ok && histData.sessions) {
                setSessionsHistory(histData.sessions);
            }
        } catch (e) {
            console.error('Failed to fetch live session:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (roomId) {
            fetchCurrentSession();
        }
    }, [roomId]);

    // Socket.IO setup for live signaling using shared socket
    useEffect(() => {
        if (!socket) return;
        socketRef.current = socket;

        const handleLiveSessionStarted = (liveSess) => {
            if (liveSess.roomId.toString() === roomId.toString()) {
                setSession(liveSess);
            }
        };

        const handleLiveSessionEnded = (endedSess) => {
            if (endedSess.roomId.toString() === roomId.toString()) {
                setSession(null);
                setInLiveSession(false);
                cleanupMedia();
            }
        };

        const handleChatMessage = (msg) => {
            setChatMessages(prev => [...prev, msg]);
        };

        const handleHandRaised = ({ user: u }) => {
            setRaisedHandsList(prev => [...prev.filter(h => h.userId !== u._id), { userId: u._id, fullname: u.fullname }]);
        };

        const handleHandLowered = ({ user: u }) => {
            setRaisedHandsList(prev => prev.filter(h => h.userId !== u._id));
        };

        const handleParticipantKicked = ({ userId }) => {
            if (userId === user?._id) {
                alert('You have been removed from this live class by the instructor.');
                handleLeaveSession();
            }
        };

        const handleWhiteboardPerm = ({ studentsCanDraw: scd }) => {
            setStudentsCanDraw(scd);
        };

        const handlePeerJoined = async ({ userId, fullname, role }) => {
            if (userId === user?._id) return;
            createPeerOffer(userId, fullname, role);
        };

        const handleWebrtcOffer = async ({ offer, senderId, senderName }) => {
            handleReceiveOffer(senderId, senderName, offer);
        };

        const handleWebrtcAnswer = async ({ answer, senderId }) => {
            const pc = peerConnectionsRef.current[senderId];
            if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
            }
        };

        const handleIceCandidate = async ({ candidate, senderId }) => {
            const pc = peerConnectionsRef.current[senderId];
            if (pc && candidate) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                    console.warn('ICE candidate addition error:', e);
                }
            }
        };

        const handlePeerLeft = ({ userId }) => {
            removePeer(userId);
        };

        socket.on('liveSessionStarted', handleLiveSessionStarted);
        socket.on('liveSessionEnded', handleLiveSessionEnded);
        socket.on('live:chat-message', handleChatMessage);
        socket.on('live:hand-raised', handleHandRaised);
        socket.on('live:hand-lowered', handleHandLowered);
        socket.on('live:participant-kicked', handleParticipantKicked);
        socket.on('live:whiteboard-permission-updated', handleWhiteboardPerm);
        socket.on('live:peer-joined', handlePeerJoined);
        socket.on('webrtc:offer', handleWebrtcOffer);
        socket.on('webrtc:answer', handleWebrtcAnswer);
        socket.on('webrtc:ice-candidate', handleIceCandidate);
        socket.on('live:peer-left', handlePeerLeft);

        return () => {
            socket.off('liveSessionStarted', handleLiveSessionStarted);
            socket.off('liveSessionEnded', handleLiveSessionEnded);
            socket.off('live:chat-message', handleChatMessage);
            socket.off('live:hand-raised', handleHandRaised);
            socket.off('live:hand-lowered', handleHandLowered);
            socket.off('live:participant-kicked', handleParticipantKicked);
            socket.off('live:whiteboard-permission-updated', handleWhiteboardPerm);
            socket.off('live:peer-joined', handlePeerJoined);
            socket.off('webrtc:offer', handleWebrtcOffer);
            socket.off('webrtc:answer', handleWebrtcAnswer);
            socket.off('webrtc:ice-candidate', handleIceCandidate);
            socket.off('live:peer-left', handlePeerLeft);
        };
    }, [roomId, socket, user]);

    // Media Device Init
    const initLocalMedia = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            setLocalStream(stream);
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }
            return stream;
        } catch (err) {
            console.warn('Media devices could not be initialized:', err);
            // Fallback audio or no media
            return null;
        }
    };

    const cleanupMedia = () => {
        if (localStream) {
            localStream.getTracks().forEach(t => t.stop());
            setLocalStream(null);
        }
        Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
        peerConnectionsRef.current = {};
        setPeers({});
    };

    // WebRTC Peer Connection Methods
    const createPeerOffer = async (targetUserId, fullname, role) => {
        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnectionsRef.current[targetUserId] = pc;

        if (localStream) {
            localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
        }

        pc.onicecandidate = (event) => {
            if (event.candidate && socketRef.current) {
                socketRef.current.emit('webrtc:ice-candidate', {
                    sessionId: session?._id,
                    targetUserId,
                    candidate: event.candidate,
                    senderId: user?._id
                });
            }
        };

        pc.ontrack = (event) => {
            setPeers(prev => ({
                ...prev,
                [targetUserId]: {
                    stream: event.streams[0],
                    fullname,
                    role
                }
            }));
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        if (socketRef.current) {
            socketRef.current.emit('webrtc:offer', {
                sessionId: session?._id,
                targetUserId,
                offer,
                senderId: user?._id,
                senderName: user?.fullname
            });
        }
    };

    const handleReceiveOffer = async (senderId, senderName, offer) => {
        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnectionsRef.current[senderId] = pc;

        if (localStream) {
            localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
        }

        pc.onicecandidate = (event) => {
            if (event.candidate && socketRef.current) {
                socketRef.current.emit('webrtc:ice-candidate', {
                    sessionId: session?._id,
                    targetUserId: senderId,
                    candidate: event.candidate,
                    senderId: user?._id
                });
            }
        };

        pc.ontrack = (event) => {
            setPeers(prev => ({
                ...prev,
                [senderId]: {
                    stream: event.streams[0],
                    fullname: senderName,
                    role: 'student'
                }
            }));
        };

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (socketRef.current) {
            socketRef.current.emit('webrtc:answer', {
                sessionId: session?._id,
                targetUserId: senderId,
                answer,
                senderId: user?._id
            });
        }
    };

    const removePeer = (userId) => {
        if (peerConnectionsRef.current[userId]) {
            peerConnectionsRef.current[userId].close();
            delete peerConnectionsRef.current[userId];
        }
        setPeers(prev => {
            const next = { ...prev };
            delete next[userId];
            return next;
        });
    };

    // Toggle Audio
    const toggleMic = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMicOn(audioTrack.enabled);
            }
        }
    };

    // Toggle Video
    const toggleVideo = () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOn(videoTrack.enabled);
            }
        }
    };

    // Screen Share
    const toggleScreenShare = async () => {
        if (!isScreenSharing) {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                const screenTrack = screenStream.getVideoTracks()[0];

                Object.values(peerConnectionsRef.current).forEach(pc => {
                    const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
                    if (sender) sender.replaceTrack(screenTrack);
                });

                if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;

                screenTrack.onended = () => {
                    stopScreenShare();
                };

                setIsScreenSharing(true);
                if (socketRef.current) {
                    socketRef.current.emit('live:screen-share-started', { sessionId: session?._id, user });
                }
            } catch (e) {
                console.warn('Screen share failed:', e);
            }
        } else {
            stopScreenShare();
        }
    };

    const stopScreenShare = () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            Object.values(peerConnectionsRef.current).forEach(pc => {
                const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
                if (sender && videoTrack) sender.replaceTrack(videoTrack);
            });
            if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
        }
        setIsScreenSharing(false);
        if (socketRef.current) {
            socketRef.current.emit('live:screen-share-stopped', { sessionId: session?._id, user });
        }
    };

    // Toggle Hand Raise
    const toggleHandRaise = () => {
        const next = !handRaised;
        setHandRaised(next);
        if (socketRef.current) {
            socketRef.current.emit(next ? 'live:hand-raised' : 'live:hand-lowered', {
                sessionId: session?._id,
                user
            });
        }
    };

    // Join Session
    const handleJoinSession = async () => {
        try {
            await initLocalMedia();
            const res = await fetch(`${API_BASE_URL}/api/live-sessions/${session._id}/join`, {
                method: 'POST',
                credentials: 'include'
            });
            if (res.ok) {
                setInLiveSession(true);
                if (socketRef.current) {
                    socketRef.current.emit('live:join', { sessionId: session._id, user });
                }
            }
        } catch (err) {
            console.error('Failed to join live session:', err);
        }
    };

    // Start Live Class (Teacher)
    const handleStartSession = async (sessId) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/live-sessions/${sessId}/start`, {
                method: 'POST',
                credentials: 'include'
            });
            const data = await res.json();
            if (res.ok) {
                setSession(data.session);
                handleJoinSession();
            }
        } catch (e) {
            console.error('Start session error:', e);
        }
    };

    // End Live Class (Teacher)
    const handleEndSession = async () => {
        if (!confirm('Are you sure you want to end this live class? Live attendance will be automatically calculated.')) return;
        try {
            await fetch(`${API_BASE_URL}/api/live-sessions/${session._id}/end`, {
                method: 'POST',
                credentials: 'include'
            });
            setInLiveSession(false);
            cleanupMedia();
            fetchCurrentSession();
        } catch (e) {
            console.error('End session error:', e);
        }
    };

    // Leave Session (Student)
    const handleLeaveSession = async () => {
        try {
            await fetch(`${API_BASE_URL}/api/live-sessions/${session._id}/leave`, {
                method: 'POST',
                credentials: 'include'
            });
            if (socketRef.current) {
                socketRef.current.emit('live:leave', { sessionId: session._id, user });
            }
        } catch (e) {}
        setInLiveSession(false);
        cleanupMedia();
    };

    // Send Chat Message
    const handleSendChatMessage = (e) => {
        e.preventDefault();
        if (!chatInput.trim() || !socketRef.current) return;
        const msg = {
            id: Math.random().toString(36).substring(2),
            senderId: user?._id,
            senderName: user?.fullname,
            role: user?.role,
            text: chatInput.trim(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        socketRef.current.emit('live:chat-message', { sessionId: session?._id, message: msg });
        setChatInput('');
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-[#0f0f12] rounded-3xl border border-gray-200 dark:border-white/5 overflow-hidden shadow-xl">
            {/* Top Bar */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between bg-gradient-to-r from-red-500/10 via-purple-500/10 to-transparent">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg ${session?.status === 'live' ? 'bg-red-600 shadow-red-500/20 animate-pulse' : 'bg-purple-600 shadow-purple-500/20'}`}>
                        <Video className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white">
                                {session?.title || 'Virtual Classroom'}
                            </h3>
                            {session?.status === 'live' && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-red-500/20 text-red-600 dark:text-red-400 flex items-center gap-1">
                                    <Radio className="w-3 h-3 animate-ping" /> Live
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">WebRTC Video & Collaborative Whiteboard</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isTeacher && !inLiveSession && (
                        <button
                            onClick={() => setShowScheduleModal(true)}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xs font-bold shadow-md shadow-purple-500/20 flex items-center gap-1.5 transition-all active:scale-95"
                        >
                            <Plus className="w-3.5 h-3.5" /> Schedule Class
                        </button>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {!inLiveSession && (
                    <div className="flex-1 p-6 flex flex-col justify-center items-center text-center space-y-6 max-w-lg mx-auto">
                        {session?.status === 'live' ? (
                            <div className="space-y-4 animate-in fade-in">
                                <div className="w-16 h-16 rounded-3xl bg-red-500/10 text-red-600 mx-auto flex items-center justify-center animate-pulse">
                                    <Video className="w-8 h-8" />
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">{session.title} is LIVE</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Instructor: {session.hostId?.fullname || 'Teacher'}</p>
                                </div>
                                <button
                                    onClick={handleJoinSession}
                                    className="px-8 py-3.5 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white rounded-2xl text-xs font-bold shadow-xl shadow-red-500/20 active:scale-95 transition-all flex items-center gap-2 mx-auto"
                                >
                                    <Play className="w-4 h-4" /> Join Virtual Classroom
                                </button>
                            </div>
                        ) : session?.status === 'scheduled' ? (
                            <div className="space-y-4">
                                <div className="w-16 h-16 rounded-3xl bg-purple-500/10 text-purple-600 mx-auto flex items-center justify-center">
                                    <Clock className="w-8 h-8" />
                                </div>
                                <div>
                                    <h4 className="text-base font-bold text-gray-900 dark:text-white">{session.title}</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Scheduled for: {session.scheduledAt ? new Date(session.scheduledAt).toLocaleString() : 'Upcoming'}
                                    </p>
                                </div>
                                {isTeacher ? (
                                    <button
                                        onClick={() => handleStartSession(session._id)}
                                        className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-purple-500/20 active:scale-95 transition-all flex items-center gap-2 mx-auto"
                                    >
                                        <Play className="w-4 h-4" /> Start Live Class Now
                                    </button>
                                ) : (
                                    <div className="p-3 bg-purple-500/5 rounded-2xl border border-purple-500/10 text-xs text-purple-600 dark:text-purple-400 font-semibold">
                                        Waiting for instructor to start the class...
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/5 text-gray-400 mx-auto flex items-center justify-center">
                                    <Video className="w-6 h-6" />
                                </div>
                                <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">No active live class</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
                                    {isTeacher ? 'Schedule an interactive virtual lecture or start an ad-hoc session anytime.' : 'Your instructor has not scheduled an active live class.'}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* ACTIVE LIVE CLASSROOM WORKSPACE */}
                {inLiveSession && (
                    <div className="flex-1 flex overflow-hidden">
                        {/* Main Stage (Video or Whiteboard) */}
                        <div className="flex-1 flex flex-col p-4 space-y-3 overflow-hidden bg-black/90">
                            {/* View Switcher Tabs */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl backdrop-blur-md">
                                    <button
                                        onClick={() => setActiveView('video')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${activeView === 'video' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-300 hover:text-white'}`}
                                    >
                                        <Video className="w-3.5 h-3.5" /> Video Grid
                                    </button>
                                    <button
                                        onClick={() => setActiveView('whiteboard')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${activeView === 'whiteboard' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-300 hover:text-white'}`}
                                    >
                                        <PenTool className="w-3.5 h-3.5" /> Whiteboard
                                    </button>
                                </div>

                                {raisedHandsList.length > 0 && (
                                    <div className="px-3 py-1 bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-bounce">
                                        <Hand className="w-3.5 h-3.5" /> {raisedHandsList.length} Hand(s) Raised
                                    </div>
                                )}
                            </div>

                            {/* View Canvas / Video Grid */}
                            <div className="flex-1 rounded-2xl overflow-hidden relative">
                                {activeView === 'video' ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 h-full overflow-y-auto custom-scrollbar p-2">
                                        {/* Local User Tile */}
                                        <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-white/10 aspect-video flex items-center justify-center shadow-lg">
                                            <video
                                                ref={localVideoRef}
                                                autoPlay
                                                muted
                                                playsInline
                                                className={`w-full h-full object-cover ${!isVideoOn ? 'hidden' : ''}`}
                                            />
                                            {!isVideoOn && (
                                                <div className="text-center space-y-2">
                                                    <div className="w-12 h-12 rounded-full bg-purple-600 text-white mx-auto flex items-center justify-center font-bold text-lg">
                                                        {user?.fullname?.[0] || 'U'}
                                                    </div>
                                                    <p className="text-xs text-gray-300 font-semibold">{user?.fullname} (You)</p>
                                                </div>
                                            )}
                                            <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1.5">
                                                <span>{user?.fullname} (You)</span>
                                                {!isMicOn && <MicOff className="w-3 h-3 text-red-400" />}
                                            </div>
                                        </div>

                                        {/* Remote Peer Tiles */}
                                        {Object.entries(peers).map(([peerId, peerData]) => (
                                            <div key={peerId} className="relative rounded-2xl overflow-hidden bg-slate-900 border border-white/10 aspect-video flex items-center justify-center shadow-lg">
                                                <video
                                                    autoPlay
                                                    playsInline
                                                    ref={el => { if (el && peerData.stream) el.srcObject = peerData.stream; }}
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1.5">
                                                    <span>{peerData.fullname}</span>
                                                    {peerData.role === 'teacher' && <span className="text-[9px] bg-purple-600 px-1 rounded">Host</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <Whiteboard
                                        sessionId={session?._id}
                                        isTeacher={isTeacher}
                                        canDraw={studentsCanDraw}
                                        socket={socketRef.current}
                                        onToggleDrawPermission={isTeacher ? () => {
                                            const next = !studentsCanDraw;
                                            setStudentsCanDraw(next);
                                            fetch(`${API_BASE_URL}/api/live-sessions/${session._id}/whiteboard-permission`, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                credentials: 'include',
                                                body: JSON.stringify({ studentsCanDraw: next })
                                            });
                                        } : null}
                                    />
                                )}
                            </div>

                            {/* Bottom Controls Bar */}
                            <div className="px-4 py-3 bg-slate-900/90 border border-white/10 rounded-2xl backdrop-blur-md flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={toggleMic}
                                        className={`p-3 rounded-xl transition-all ${isMicOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-600 text-white shadow-lg shadow-red-500/20'}`}
                                        title={isMicOn ? 'Mute Mic' : 'Unmute Mic'}
                                    >
                                        {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                                    </button>
                                    <button
                                        onClick={toggleVideo}
                                        className={`p-3 rounded-xl transition-all ${isVideoOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-600 text-white shadow-lg shadow-red-500/20'}`}
                                        title={isVideoOn ? 'Turn Off Camera' : 'Turn On Camera'}
                                    >
                                        {isVideoOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                                    </button>
                                    <button
                                        onClick={toggleScreenShare}
                                        className={`p-3 rounded-xl transition-all ${isScreenSharing ? 'bg-emerald-600 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                                        title="Screen Share"
                                    >
                                        {isScreenSharing ? <MonitorOff className="w-4 h-4" /> : <MonitorUp className="w-4 h-4" />}
                                    </button>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={toggleHandRaise}
                                        className={`p-3 rounded-xl transition-all ${handRaised ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                                        title={handRaised ? 'Lower Hand' : 'Raise Hand'}
                                    >
                                        <Hand className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setActiveSidebar(activeSidebar === 'chat' ? 'none' : 'chat')}
                                        className={`p-3 rounded-xl transition-all ${activeSidebar === 'chat' ? 'bg-purple-600 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                                        title="In-class Chat"
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="flex items-center gap-2">
                                    {isTeacher ? (
                                        <button
                                            onClick={handleEndSession}
                                            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-lg shadow-red-500/20 flex items-center gap-1.5 transition-all active:scale-95"
                                        >
                                            <PhoneOff className="w-4 h-4" /> End Class
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleLeaveSession}
                                            className="px-5 py-2.5 rounded-xl bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
                                        >
                                            <PhoneOff className="w-4 h-4" /> Leave
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar (Chat / Participants) */}
                        <AnimatePresence>
                            {activeSidebar === 'chat' && (
                                <motion.div
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: 300, opacity: 1 }}
                                    exit={{ width: 0, opacity: 0 }}
                                    className="border-l border-gray-200 dark:border-white/10 bg-white dark:bg-[#121216] flex flex-col h-full"
                                >
                                    <div className="p-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
                                        <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                            <MessageSquare className="w-4 h-4 text-purple-600" /> In-Class Chat
                                        </h4>
                                        <button onClick={() => setActiveSidebar('none')} className="text-gray-400 hover:text-gray-600">
                                            <Square className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                        {chatMessages.map(m => (
                                            <div key={m.id} className="space-y-0.5 text-xs">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-gray-900 dark:text-white">{m.senderName}</span>
                                                    <span className="text-[10px] text-gray-400">{m.timestamp}</span>
                                                </div>
                                                <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-white/[0.03] p-2.5 rounded-xl border border-gray-100 dark:border-white/5">
                                                    {m.text}
                                                </p>
                                            </div>
                                        ))}
                                    </div>

                                    <form onSubmit={handleSendChatMessage} className="p-3 border-t border-gray-100 dark:border-white/10 flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Message class..."
                                            value={chatInput}
                                            onChange={e => setChatInput(e.target.value)}
                                            className="flex-1 px-3 py-2 bg-gray-100 dark:bg-white/5 border border-transparent focus:border-purple-500 rounded-xl text-xs outline-none text-gray-900 dark:text-white font-medium"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!chatInput.trim()}
                                            className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition-all"
                                        >
                                            Send
                                        </button>
                                    </form>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Live Schedule Modal */}
            {showScheduleModal && (
                <LiveScheduleModal
                    isOpen={showScheduleModal}
                    onClose={() => setShowScheduleModal(false)}
                    roomId={roomId}
                    onSessionCreated={(newSess) => {
                        setSession(newSess);
                        fetchCurrentSession();
                    }}
                />
            )}
        </div>
    );
};

export default LiveClassroom;
