import React, { useState, useEffect, useRef, useCallback } from 'react';
import { socketService } from '../../services/socketService';
import {
  getWhiteboardStateApi,
  saveWhiteboardStateApi,
} from '../../services/collaborationApi';
import {
  PenTool,
  Eraser,
  Minus,
  Square,
  Circle,
  Undo2,
  Trash2,
  Download,
  X,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface WhiteboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  roomCode: string;
  currentUserId: string;
}

type Tool = 'pen' | 'eraser' | 'line' | 'rect' | 'circle';

interface Stroke {
  tool: Tool;
  color: string;
  width: number;
  points: { x: number; y: number }[];
}

const COLORS = [
  '#ffffff',
  '#94a3b8',
  '#f87171',
  '#fb923c',
  '#facc15',
  '#4ade80',
  '#38bdf8',
  '#818cf8',
  '#c084fc',
];

const WIDTHS = [2, 4, 8, 14];

export const WhiteboardModal: React.FC<WhiteboardModalProps> = ({
  isOpen,
  onClose,
  meetingId,
  roomCode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentTool, setCurrentTool] = useState<Tool>('pen');
  const [currentColor, setCurrentColor] = useState<string>('#38bdf8');
  const [currentWidth, setCurrentWidth] = useState<number>(4);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const currentStrokeRef = useRef<Stroke | null>(null);

  // Redraw canvas from strokes
  const redrawCanvas = useCallback((strokeList: Stroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Dark chalkboard background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Render subtle dot grid
    ctx.fillStyle = '#1e293b';
    const gridSize = 24;
    for (let x = gridSize; x < canvas.width; x += gridSize) {
      for (let y = gridSize; y < canvas.height; y += gridSize) {
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }

    strokeList.forEach((stroke) => {
      if (stroke.points.length === 0) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.tool === 'eraser' ? '#0f172a' : stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.tool === 'pen' || stroke.tool === 'eraser') {
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      } else if (stroke.tool === 'line') {
        const start = stroke.points[0];
        const end = stroke.points[stroke.points.length - 1];
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      } else if (stroke.tool === 'rect') {
        const start = stroke.points[0];
        const end = stroke.points[stroke.points.length - 1];
        const w = end.x - start.x;
        const h = end.y - start.y;
        ctx.strokeRect(start.x, start.y, w, h);
      } else if (stroke.tool === 'circle') {
        const start = stroke.points[0];
        const end = stroke.points[stroke.points.length - 1];
        const rx = Math.abs(end.x - start.x) / 2;
        const ry = Math.abs(end.y - start.y) / 2;
        const cx = Math.min(start.x, end.x) + rx;
        const cy = Math.min(start.y, end.y) + ry;
        ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
        ctx.stroke();
      }
    });
  }, []);

  // Initial load
  useEffect(() => {
    if (!isOpen || !meetingId) return;

    let isMounted = true;

    async function loadState() {
      try {
        const rawJson = await getWhiteboardStateApi(meetingId);
        if (rawJson && isMounted) {
          const parsed = JSON.parse(rawJson);
          if (Array.isArray(parsed)) {
            setStrokes(parsed);
            redrawCanvas(parsed);
          }
        }
      } catch (err) {
        console.error('[Whiteboard] Failed to load snapshot:', err);
      }
    }

    loadState();

    const socket = socketService.getSocket();

    const handleRemoteDraw = (data: { stroke: Stroke }) => {
      if (data && data.stroke) {
        setStrokes((prev) => {
          const updated = [...prev, data.stroke];
          redrawCanvas(updated);
          return updated;
        });
      }
    };

    const handleRemoteClear = () => {
      setStrokes([]);
      redrawCanvas([]);
    };

    const handleRemoteSync = (data: { strokesJson: string }) => {
      try {
        const parsed = JSON.parse(data.strokesJson);
        if (Array.isArray(parsed)) {
          setStrokes(parsed);
          redrawCanvas(parsed);
        }
      } catch {
        // Ignore parse error
      }
    };

    socket.on('whiteboard:draw', handleRemoteDraw);
    socket.on('whiteboard:clear', handleRemoteClear);
    socket.on('whiteboard:sync', handleRemoteSync);

    return () => {
      isMounted = false;
      socket.off('whiteboard:draw', handleRemoteDraw);
      socket.off('whiteboard:clear', handleRemoteClear);
      socket.off('whiteboard:sync', handleRemoteSync);
    };
  }, [isOpen, meetingId, redrawCanvas]);

  // Adjust canvas resolution on modal open / resize
  useEffect(() => {
    if (!isOpen) return;

    const updateCanvasSize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
        redrawCanvas(strokes);
      }
    };

    const timer = setTimeout(updateCanvasSize, 50);
    window.addEventListener('resize', updateCanvasSize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [isOpen, isFullscreen, strokes, redrawCanvas]);

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e);
    setIsDrawing(true);

    const newStroke: Stroke = {
      tool: currentTool,
      color: currentColor,
      width: currentTool === 'eraser' ? currentWidth * 3 : currentWidth,
      points: [coords],
    };

    currentStrokeRef.current = newStroke;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentStrokeRef.current) return;
    const coords = getCanvasCoordinates(e);

    if (currentTool === 'pen' || currentTool === 'eraser') {
      currentStrokeRef.current.points.push(coords);
      redrawCanvas([...strokes, currentStrokeRef.current]);
    } else {
      // Shape preview
      currentStrokeRef.current.points = [currentStrokeRef.current.points[0], coords];
      redrawCanvas([...strokes, currentStrokeRef.current]);
    }
  };

  const stopDrawing = () => {
    if (!isDrawing || !currentStrokeRef.current) return;
    setIsDrawing(false);

    const finishedStroke = currentStrokeRef.current;
    currentStrokeRef.current = null;

    const updatedStrokes = [...strokes, finishedStroke];
    setStrokes(updatedStrokes);
    redrawCanvas(updatedStrokes);

    // Emit live stroke to room
    const socket = socketService.getSocket();
    socket.emit('whiteboard:draw', {
      roomCode,
      stroke: finishedStroke,
    });

    // Periodically save full sync
    const json = JSON.stringify(updatedStrokes);
    socket.emit('whiteboard:sync', {
      roomCode,
      strokesJson: json,
    });
    saveWhiteboardStateApi(meetingId, json).catch(() => {});
  };

  const handleUndo = () => {
    if (strokes.length === 0) return;
    const updated = strokes.slice(0, -1);
    setStrokes(updated);
    redrawCanvas(updated);

    const json = JSON.stringify(updated);
    const socket = socketService.getSocket();
    socket.emit('whiteboard:sync', {
      roomCode,
      strokesJson: json,
    });
    saveWhiteboardStateApi(meetingId, json).catch(() => {});
  };

  const handleClear = () => {
    if (!window.confirm('Clear all whiteboard contents for everyone in this meeting?')) return;
    setStrokes([]);
    redrawCanvas([]);

    const socket = socketService.getSocket();
    socket.emit('whiteboard:clear', { roomCode });
    saveWhiteboardStateApi(meetingId, '[]').catch(() => {});
  };

  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `connectsphere-whiteboard-${roomCode}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div
        className={`bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          isFullscreen ? 'w-full h-full rounded-none border-none' : 'w-full max-w-5xl h-[85vh]'
        }`}
      >
        {/* Header Toolbar */}
        <div className="p-3 sm:p-4 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
              Collaborative Whiteboard
            </h3>
            <span className="text-xs text-slate-400 font-mono">({roomCode})</span>
          </div>

          {/* Tools Palette */}
          <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700/60">
            <button
              type="button"
              onClick={() => setCurrentTool('pen')}
              className={`p-1.5 rounded-lg transition-colors ${
                currentTool === 'pen'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Pen Tool"
            >
              <PenTool className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentTool('line')}
              className={`p-1.5 rounded-lg transition-colors ${
                currentTool === 'line'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Line"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentTool('rect')}
              className={`p-1.5 rounded-lg transition-colors ${
                currentTool === 'rect'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Rectangle"
            >
              <Square className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentTool('circle')}
              className={`p-1.5 rounded-lg transition-colors ${
                currentTool === 'circle'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Circle / Ellipse"
            >
              <Circle className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentTool('eraser')}
              className={`p-1.5 rounded-lg transition-colors ${
                currentTool === 'eraser'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Eraser"
            >
              <Eraser className="w-4 h-4" />
            </button>
          </div>

          {/* Color Presets */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700/60">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrentColor(c)}
                className={`w-5 h-5 rounded-full border-2 transition-transform ${
                  currentColor === c ? 'border-white scale-110 shadow-md' : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: c }}
                title={`Color ${c}`}
              />
            ))}
          </div>

          {/* Stroke Widths */}
          <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700/60">
            {WIDTHS.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setCurrentWidth(w)}
                className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                  currentWidth === w
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={`Stroke Width: ${w}px`}
              >
                {w}px
              </button>
            ))}
          </div>

          {/* Canvas Actions */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleUndo}
              disabled={strokes.length === 0}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
              title="Undo last stroke"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              title="Clear entire whiteboard"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleExportPNG}
              className="p-2 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
              title="Export as PNG"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close Whiteboard"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Canvas Body */}
        <div className="flex-1 relative cursor-crosshair overflow-hidden select-none bg-slate-950">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className="w-full h-full block"
          />
        </div>
      </div>
    </div>
  );
};
