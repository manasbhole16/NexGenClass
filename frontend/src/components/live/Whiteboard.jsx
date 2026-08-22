import React, { useRef, useState, useEffect } from 'react';
import { 
    Pencil, 
    Eraser, 
    Square, 
    Circle, 
    Type, 
    Undo, 
    Redo, 
    Trash2, 
    Lock, 
    Unlock, 
    Download,
    Palette
} from 'lucide-react';

const COLORS = [
    '#000000', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#FFFFFF'
];

const STROKE_WIDTHS = [2, 4, 8, 14];

const Whiteboard = ({ sessionId, isTeacher, canDraw = true, socket, onToggleDrawPermission }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState('pencil'); // 'pencil' | 'eraser' | 'rect' | 'circle'
    const [color, setColor] = useState('#8B5CF6');
    const [strokeWidth, setStrokeWidth] = useState(4);
    const [history, setHistory] = useState([]);
    const [redoStack, setRedoStack] = useState([]);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });

    const effectiveCanDraw = isTeacher || canDraw;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        // Handle responsive canvas dimensions
        const resizeCanvas = () => {
            const parent = canvas.parentElement;
            if (parent) {
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
                redrawAll(history);
            }
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        return () => window.removeEventListener('resize', resizeCanvas);
    }, [history]);

    // Socket Listener for remote whiteboard operations
    useEffect(() => {
        if (!socket) return;

        const handleRemoteOp = (op) => {
            setHistory(prev => [...prev, op]);
            drawOperation(op);
        };

        const handleRemoteClear = () => {
            setHistory([]);
            setRedoStack([]);
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        };

        socket.on('live:whiteboard-operation', handleRemoteOp);
        socket.on('live:whiteboard-clear', handleRemoteClear);

        return () => {
            socket.off('live:whiteboard-operation', handleRemoteOp);
            socket.off('live:whiteboard-clear', handleRemoteClear);
        };
    }, [socket]);

    const drawOperation = (op) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        ctx.save();
        ctx.strokeStyle = op.color;
        ctx.lineWidth = op.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (op.tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
        } else {
            ctx.globalCompositeOperation = 'source-over';
        }

        if (op.tool === 'pencil' || op.tool === 'eraser') {
            if (op.points && op.points.length > 1) {
                ctx.beginPath();
                ctx.moveTo(op.points[0].x, op.points[0].y);
                for (let i = 1; i < op.points.length; i++) {
                    ctx.lineTo(op.points[i].x, op.points[i].y);
                }
                ctx.stroke();
            }
        } else if (op.tool === 'rect') {
            ctx.strokeRect(op.x, op.y, op.w, op.h);
        } else if (op.tool === 'circle') {
            ctx.beginPath();
            ctx.arc(op.x, op.y, op.r, 0, 2 * Math.PI);
            ctx.stroke();
        }

        ctx.restore();
    };

    const redrawAll = (ops) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ops.forEach(drawOperation);
    };

    const currentPointsRef = useRef([]);

    const handleMouseDown = (e) => {
        if (!effectiveCanDraw) return;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setIsDrawing(true);
        setStartPos({ x, y });
        currentPointsRef.current = [{ x, y }];
    };

    const handleMouseMove = (e) => {
        if (!isDrawing || !effectiveCanDraw) return;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (tool === 'pencil' || tool === 'eraser') {
            currentPointsRef.current.push({ x, y });
            const pts = currentPointsRef.current;
            const ctx = canvas.getContext('2d');

            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = strokeWidth;
            ctx.lineCap = 'round';
            if (tool === 'eraser') ctx.globalCompositeOperation = 'destination-out';

            ctx.beginPath();
            ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.restore();
        }
    };

    const handleMouseUp = (e) => {
        if (!isDrawing || !effectiveCanDraw) return;
        setIsDrawing(false);

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        let op = null;
        if (tool === 'pencil' || tool === 'eraser') {
            if (currentPointsRef.current.length > 1) {
                op = {
                    id: Math.random().toString(36).substring(2),
                    tool,
                    color,
                    width: strokeWidth,
                    points: [...currentPointsRef.current]
                };
            }
        } else if (tool === 'rect') {
            op = {
                id: Math.random().toString(36).substring(2),
                tool: 'rect',
                color,
                width: strokeWidth,
                x: Math.min(startPos.x, x),
                y: Math.min(startPos.y, y),
                w: Math.abs(x - startPos.x),
                h: Math.abs(y - startPos.y)
            };
            drawOperation(op);
        } else if (tool === 'circle') {
            const radius = Math.sqrt(Math.pow(x - startPos.x, 2) + Math.pow(y - startPos.y, 2));
            op = {
                id: Math.random().toString(36).substring(2),
                tool: 'circle',
                color,
                width: strokeWidth,
                x: startPos.x,
                y: startPos.y,
                r: radius
            };
            drawOperation(op);
        }

        if (op) {
            setHistory(prev => [...prev, op]);
            setRedoStack([]);
            if (socket) {
                socket.emit('live:whiteboard-operation', { sessionId, operation: op });
            }
        }
    };

    const handleClear = () => {
        if (!isTeacher) return;
        setHistory([]);
        setRedoStack([]);
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        if (socket) {
            socket.emit('live:whiteboard-clear', { sessionId });
        }
    };

    const handleUndo = () => {
        if (history.length === 0) return;
        const newHistory = [...history];
        const popped = newHistory.pop();
        setHistory(newHistory);
        setRedoStack(prev => [...prev, popped]);
        redrawAll(newHistory);
    };

    const handleRedo = () => {
        if (redoStack.length === 0) return;
        const newRedo = [...redoStack];
        const popped = newRedo.pop();
        setRedoStack(newRedo);
        const newHistory = [...history, popped];
        setHistory(newHistory);
        redrawAll(newHistory);
    };

    const handleDownloadImage = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const image = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `whiteboard_${sessionId || 'class'}.png`;
        link.href = image;
        link.click();
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-[#121216] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-xl relative">
            {/* Whiteboard Toolbar */}
            <div className="p-3 border-b border-gray-100 dark:border-white/10 bg-gray-50/80 dark:bg-black/30 backdrop-blur-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 bg-white dark:bg-white/5 p-1 rounded-xl border border-gray-200 dark:border-white/5">
                    <button
                        onClick={() => setTool('pencil')}
                        disabled={!effectiveCanDraw}
                        className={`p-2 rounded-lg transition-colors ${tool === 'pencil' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                        title="Freehand Pencil"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setTool('eraser')}
                        disabled={!effectiveCanDraw}
                        className={`p-2 rounded-lg transition-colors ${tool === 'eraser' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                        title="Eraser"
                    >
                        <Eraser className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setTool('rect')}
                        disabled={!effectiveCanDraw}
                        className={`p-2 rounded-lg transition-colors ${tool === 'rect' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                        title="Rectangle"
                    >
                        <Square className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setTool('circle')}
                        disabled={!effectiveCanDraw}
                        className={`p-2 rounded-lg transition-colors ${tool === 'circle' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                        title="Circle"
                    >
                        <Circle className="w-4 h-4" />
                    </button>
                </div>

                {/* Colors */}
                {effectiveCanDraw && (
                    <div className="flex items-center gap-1.5">
                        {COLORS.map((c) => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                className={`w-5 h-5 rounded-full border border-gray-300 dark:border-white/20 transition-transform ${color === c ? 'scale-125 ring-2 ring-purple-500 ring-offset-1 dark:ring-offset-black' : 'hover:scale-110'}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                    {effectiveCanDraw && (
                        <>
                            <button
                                onClick={handleUndo}
                                disabled={history.length === 0}
                                className="p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white disabled:opacity-30"
                                title="Undo"
                            >
                                <Undo className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleRedo}
                                disabled={redoStack.length === 0}
                                className="p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white disabled:opacity-30"
                                title="Redo"
                            >
                                <Redo className="w-4 h-4" />
                            </button>
                        </>
                    )}

                    <button
                        onClick={handleDownloadImage}
                        className="p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white"
                        title="Download Canvas PNG"
                    >
                        <Download className="w-4 h-4" />
                    </button>

                    {isTeacher && (
                        <>
                            {onToggleDrawPermission && (
                                <button
                                    onClick={onToggleDrawPermission}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors ${canDraw ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}
                                    title="Toggle student drawing permission"
                                >
                                    {canDraw ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                    <span className="hidden sm:inline">{canDraw ? 'Student Edit ON' : 'View Only'}</span>
                                </button>
                            )}

                            <button
                                onClick={handleClear}
                                className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                title="Clear Whiteboard"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Canvas Container */}
            <div className="flex-1 relative cursor-crosshair overflow-hidden bg-[#fafafa] dark:bg-[#0b0b0e]">
                <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    className="w-full h-full block"
                />

                {!effectiveCanDraw && (
                    <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center gap-1.5 backdrop-blur-md">
                        <Lock className="w-3.5 h-3.5" /> Read-Only Whiteboard
                    </div>
                )}
            </div>
        </div>
    );
};

export default Whiteboard;
