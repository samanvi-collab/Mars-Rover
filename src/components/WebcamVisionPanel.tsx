/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  AlertCircle,
  Eye,
  Activity,
  Layers,
  Sparkles,
  Maximize2,
  Minimize2,
  RefreshCw,
} from 'lucide-react';
import {
  GestureType,
  RoverCommand,
  LandmarkPoint,
  GestureDetectionResult,
} from '../types/rover';
import {
  classifyHandGesture,
  mapGestureToCommand,
  GestureSmoother,
  GESTURE_DEFINITIONS,
  getSyntheticLandmarks,
} from '../utils/gestureClassifier';

// MediaPipe 21 Hand Landmark Connections
const HAND_CONNECTIONS = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index finger
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle finger
  [9, 10], [10, 11], [11, 12],
  // Ring finger
  [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm connections
  [5, 9], [9, 13], [13, 17],
];

interface WebcamVisionPanelProps {
  isCameraActive: boolean;
  onStartCamera: () => void;
  onStopCamera: () => void;
  isTestFeedActive: boolean;
  onStartTestFeed: () => void;
  onSelectSyntheticGesture: (gesture: GestureType) => void;
  onGestureDetected: (result: GestureDetectionResult) => void;
  activeCommand: RoverCommand;
  activeGesture: GestureType;
  confidence: number;
}

export const WebcamVisionPanel: React.FC<WebcamVisionPanelProps> = ({
  isCameraActive,
  onStartCamera,
  onStopCamera,
  isTestFeedActive,
  onStartTestFeed,
  onSelectSyntheticGesture,
  onGestureDetected,
  activeCommand,
  activeGesture,
  confidence,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<any>(null);
  const requestAnimationRef = useRef<number | null>(null);
  const smootherRef = useRef<GestureSmoother>(new GestureSmoother(4));

  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [fps, setFps] = useState<number>(0);
  const [latencyMs, setLatencyMs] = useState<number>(0);
  const [isMirrored, setIsMirrored] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);

  // Initialize MediaPipe Vision HandLandmarker
  useEffect(() => {
    let isMounted = true;

    async function initMediaPipe() {
      setIsLoadingModel(true);
      setModelError(null);
      try {
        const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        if (!isMounted) return;

        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        if (isMounted) {
          landmarkerRef.current = landmarker;
          setIsLoadingModel(false);
        }
      } catch (err: any) {
        console.warn('MediaPipe initialization fallback to CPU or synthetic mode:', err);
        if (isMounted) {
          setIsLoadingModel(false);
          // Don't treat as fatal error since synthetic test feed & fallback gesture inputs are available
          setModelError(
            'Hardware acceleration / WebAssembly model loading in progress or restricted. Test gesture simulation is active.'
          );
        }
      }
    }

    initMediaPipe();

    return () => {
      isMounted = false;
      if (landmarkerRef.current) {
        try {
          landmarkerRef.current.close();
        } catch {}
      }
    };
  }, []);

  // Handle webcam stream start / stop
  useEffect(() => {
    let active = true;

    async function setupCamera() {
      if (!isCameraActive) {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        return;
      }

      setCameraError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
          audio: false,
        });

        if (!active) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(e => console.error('Play error', e));
          };
        }
      } catch (err: any) {
        console.error('Camera access error:', err);
        if (active) {
          setCameraError(
            err.name === 'NotAllowedError'
              ? 'Camera permission denied. Click Allow in browser settings or use the Synthetic Feed button below.'
              : 'Webcam device not found. You can use the Synthetic Feed below to test gestures.'
          );
        }
      }
    }

    setupCamera();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [isCameraActive]);

  // Main Detection Loop (Webcam or Synthetic)
  useEffect(() => {
    let lastTime = performance.now();
    let frameCount = 0;
    let fpsTimer = performance.now();

    const processFrame = () => {
      const now = performance.now();
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      // Update FPS counter every 500ms
      frameCount++;
      if (now - fpsTimer >= 500) {
        setFps(Math.round((frameCount * 1000) / (now - fpsTimer)));
        frameCount = 0;
        fpsTimer = now;
      }

      if (canvas && ctx) {
        // Clear previous frame
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // CASE 1: Real Webcam Vision Detection
        if (
          isCameraActive &&
          videoRef.current &&
          videoRef.current.readyState >= 2 &&
          landmarkerRef.current
        ) {
          const video = videoRef.current;
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
          }

          const startTime = performance.now();
          let results: any = null;
          try {
            results = landmarkerRef.current.detectForVideo(video, startTime);
          } catch (e) {
            // Frame skip
          }
          const latency = Math.round(performance.now() - startTime);
          setLatencyMs(latency);

          if (results && results.landmarks && results.landmarks.length > 0) {
            const rawLandmarks = results.landmarks[0] as LandmarkPoint[];
            const handedness =
              results.handedness && results.handedness[0] && results.handedness[0][0]
                ? results.handedness[0][0].displayName
                : 'Unknown';

            // Classify gesture
            const classification = classifyHandGesture(rawLandmarks, handedness);
            const stableGesture = smootherRef.current.update(classification.gesture);
            const command = mapGestureToCommand(stableGesture);

            onGestureDetected({
              gesture: stableGesture,
              command,
              confidence: classification.confidence,
              handedness,
              landmarks: rawLandmarks,
            });

            // Draw Hand Skeleton
            if (showSkeleton) {
              drawHandSkeleton(ctx, rawLandmarks, canvas.width, canvas.height, isMirrored, stableGesture);
            }
          } else {
            // No hand detected
            const stableGesture = smootherRef.current.update('NONE');
            onGestureDetected({
              gesture: stableGesture,
              command: 'STOP',
              confidence: 0,
              handedness: 'Unknown',
              landmarks: [],
            });
          }
        } else if (!isCameraActive && (isTestFeedActive || activeGesture !== 'NONE')) {
          // CASE 2: Synthetic Demonstration Hand Rendering
          if (canvas.width !== 640 || canvas.height !== 480) {
            canvas.width = 640;
            canvas.height = 480;
          }

          // Draw holographic background grid
          ctx.fillStyle = '#060A12';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          ctx.strokeStyle = 'rgba(6, 182, 212, 0.08)';
          ctx.lineWidth = 1;
          for (let x = 0; x < canvas.width; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
          }
          for (let y = 0; y < canvas.height; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
          }

          // Subtle scanline
          const scanY = (now * 0.15) % canvas.height;
          ctx.strokeStyle = 'rgba(34, 211, 238, 0.25)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, scanY);
          ctx.lineTo(canvas.width, scanY);
          ctx.stroke();

          // Render synthetic skeleton for active gesture
          const displayGesture = activeGesture !== 'NONE' ? activeGesture : 'POINT_UP';
          const syntheticPoints = getSyntheticLandmarks(displayGesture);
          if (showSkeleton) {
            drawHandSkeleton(ctx, syntheticPoints, canvas.width, canvas.height, isMirrored, displayGesture);
          }
        }
      }

      requestAnimationRef.current = requestAnimationFrame(processFrame);
    };

    requestAnimationRef.current = requestAnimationFrame(processFrame);

    return () => {
      if (requestAnimationRef.current) {
        cancelAnimationFrame(requestAnimationRef.current);
      }
    };
  }, [isCameraActive, isMirrored, showSkeleton, onGestureDetected]);

  // Synthetic Test Feed Loop
  useEffect(() => {
    if (!isTestFeedActive || isCameraActive) return;

    let intervalId: any;
    let gestureIndex = 0;
    const testGestures: GestureType[] = [
      'POINT_UP',
      'POINT_RIGHT',
      'POINT_UP',
      'POINT_LEFT',
      'VICTORY',
      'PINCH',
      'OPEN_PALM',
    ];

    intervalId = setInterval(() => {
      const g = testGestures[gestureIndex % testGestures.length];
      const cmd = mapGestureToCommand(g);
      onGestureDetected({
        gesture: g,
        command: cmd,
        confidence: 0.94,
        handedness: 'Right',
        landmarks: [],
      });
      gestureIndex++;
    }, 3500);

    return () => clearInterval(intervalId);
  }, [isTestFeedActive, isCameraActive, onGestureDetected]);

  // Draw hand skeleton lines & joints
  const drawHandSkeleton = (
    ctx: CanvasRenderingContext2D,
    landmarks: LandmarkPoint[],
    width: number,
    height: number,
    mirrored: boolean,
    gesture: GestureType
  ) => {
    const toCanvasX = (x: number) => (mirrored ? (1 - x) * width : x * width);
    const toCanvasY = (y: number) => y * height;

    // Draw connection lines
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = gesture === 'OPEN_PALM' ? '#F43F5E' : '#22D3EE';
    ctx.shadowColor = '#06B6D4';
    ctx.shadowBlur = 6;

    for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
      const p1 = landmarks[startIdx];
      const p2 = landmarks[endIdx];
      if (!p1 || !p2) continue;

      ctx.beginPath();
      ctx.moveTo(toCanvasX(p1.x), toCanvasY(p1.y));
      ctx.lineTo(toCanvasX(p2.x), toCanvasY(p2.y));
      ctx.stroke();
    }

    ctx.shadowBlur = 0;

    // Draw joints
    for (let i = 0; i < landmarks.length; i++) {
      const p = landmarks[i];
      const cx = toCanvasX(p.x);
      const cy = toCanvasY(p.y);
      const isTip = [4, 8, 12, 16, 20].includes(i);

      ctx.beginPath();
      ctx.arc(cx, cy, isTip ? 4.5 : 2.5, 0, Math.PI * 2);

      if (isTip) {
        ctx.fillStyle = '#FB923C';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillStyle = '#22D3EE';
        ctx.fill();
      }
    }

    // Draw Wrist Anchor
    const wrist = landmarks[0];
    if (wrist) {
      const wx = toCanvasX(wrist.x);
      const wy = toCanvasY(wrist.y);
      ctx.beginPath();
      ctx.arc(wx, wy, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#06B6D4';
      ctx.fill();
    }
  };

  return (
    <div className="bg-[#0D111A] border border-slate-800/90 rounded-xl overflow-hidden shadow-lg flex flex-col h-full">
      {/* Panel Subheader */}
      <div className="px-4 py-2.5 border-b border-slate-800/80 bg-[#121824]/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase font-display">
            Computer Vision Feed
          </h2>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
          <button
            type="button"
            onClick={() => setIsMirrored(!isMirrored)}
            className="hover:text-cyan-400 transition-colors"
            title="Toggle horizontal mirror"
          >
            {isMirrored ? 'Mirror: ON' : 'Mirror: OFF'}
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => setShowSkeleton(!showSkeleton)}
            className="hover:text-cyan-400 transition-colors"
            title="Toggle hand landmark skeleton overlay"
          >
            {showSkeleton ? 'Landmarks: ON' : 'Landmarks: OFF'}
          </button>
          <span aria-hidden="true">·</span>
          <span>{fps} FPS</span>
        </div>
      </div>

      {/* Main Video & Canvas Container */}
      <div className="relative aspect-video w-full bg-[#05070A] flex items-center justify-center overflow-hidden">
        {/* Real Video Element */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover ${
            isMirrored ? 'scale-x-[-1]' : ''
          } ${isCameraActive ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        />

        {/* Real-time Hand Landmark Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
        />

        {/* Corner Reticles for Futuristic Aerospace Feel */}
        <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-cyan-500/60 pointer-events-none z-20" />
        <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-cyan-500/60 pointer-events-none z-20" />
        <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-cyan-500/60 pointer-events-none z-20" />
        <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-cyan-500/60 pointer-events-none z-20" />

        {/* Floating HUD: Active Gesture & Rover Command Banner */}
        <div className="absolute top-2.5 sm:top-3 left-2.5 sm:left-3 right-2.5 sm:right-3 flex items-start justify-between z-20 pointer-events-none gap-2">
          <div className="bg-[#0B0F17]/90 backdrop-blur border border-cyan-500/40 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 shadow-md flex items-center gap-1.5 sm:gap-2 max-w-[50%]">
            <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse shrink-0" />
            <div className="min-w-0">
              <div className="text-[9px] sm:text-[10px] text-slate-400 font-mono tracking-wider truncate">
                GESTURE
              </div>
              <div className="text-[11px] sm:text-xs font-bold font-mono text-cyan-300 truncate">
                {activeGesture !== 'NONE' ? activeGesture : 'SEARCHING...'}
              </div>
            </div>
          </div>

          <div className="bg-[#0B0F17]/90 backdrop-blur border border-amber-500/40 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 shadow-md flex items-center gap-1.5 sm:gap-2 max-w-[50%] justify-end">
            <div className="min-w-0">
              <div className="text-[9px] sm:text-[10px] text-slate-400 font-mono tracking-wider text-right truncate">
                COMMAND
              </div>
              <div className="text-[11px] sm:text-xs font-bold font-mono text-amber-400 text-right truncate">
                {activeCommand}
              </div>
            </div>
            <div
              className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0 ${
                activeCommand === 'STOP'
                  ? 'bg-red-400'
                  : activeCommand === 'FORWARD'
                  ? 'bg-emerald-400 animate-ping'
                  : 'bg-cyan-400'
              }`}
            />
          </div>
        </div>

        {/* Confidence & Latency Strip */}
        <div className="absolute bottom-3 left-3 z-20 pointer-events-none bg-[#0B0F17]/90 backdrop-blur border border-slate-700/60 rounded px-2.5 py-1 text-[11px] font-mono flex items-center gap-3 text-slate-300">
          <div>
            Confidence:{' '}
            <span className="text-cyan-300">
              {activeGesture !== 'NONE' ? `${Math.round(confidence * 100)}%` : '0%'}
            </span>
          </div>
          <span aria-hidden="true" className="text-slate-600">|</span>
          <div>
            Inference: <span className="text-slate-300">{latencyMs}ms</span>
          </div>
        </div>

        {/* State: Camera Disconnected State Overlay */}
        {!isCameraActive && !isTestFeedActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#070A10]/95 z-10">
            <div className="w-14 h-14 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mb-4">
              <CameraOff className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-slate-200 mb-1">
              Webcam Feed Offline
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mb-5 leading-relaxed">
              Launch your local camera to pilot the Mars rover using real-time hand gestures, or use the Synthetic Feed below to preview controls.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onStartCamera}
                className="px-4 py-2 text-xs font-mono font-medium rounded-md bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all flex items-center gap-2 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
              >
                <Camera className="w-4 h-4" />
                <span>Initialize Camera</span>
              </button>

              <button
                type="button"
                onClick={onStartTestFeed}
                className="px-4 py-2 text-xs font-mono font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Test Simulation</span>
              </button>
            </div>

            {cameraError && (
              <div className="mt-4 p-2.5 rounded bg-amber-950/40 border border-amber-600/40 text-amber-300 text-xs max-w-md flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>{cameraError}</span>
              </div>
            )}
          </div>
        )}

        {/* State: Synthetic Feed Floating Badge & Selector (Non-blocking so hand skeleton is visible) */}
        {!isCameraActive && isTestFeedActive && (
          <div className="absolute bottom-10 left-3 right-3 sm:left-auto sm:right-3 sm:max-w-xs z-20 bg-[#0B0F17]/90 backdrop-blur border border-cyan-500/40 rounded-lg p-2.5 shadow-xl">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 text-cyan-300 text-[11px] font-mono font-semibold">
                <Sparkles className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
                <span>SYNTHETIC GESTURE LOOP</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Auto Cycle</span>
            </div>

            {/* Quick Manual Gesture Selector for Testing */}
            <div className="flex flex-wrap items-center gap-1">
              {GESTURE_DEFINITIONS.map(def => (
                <button
                  key={def.type}
                  type="button"
                  onClick={() => onSelectSyntheticGesture(def.type)}
                  className={`px-1.5 py-0.5 text-[10px] font-mono rounded transition-colors ${
                    activeGesture === def.type
                      ? 'bg-cyan-400 text-slate-950 font-bold'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                  }`}
                >
                  {def.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Panel Footer: Quick Gesture Bar */}
      <div className="p-3 border-t border-slate-800/80 bg-[#0E131E] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="font-mono text-slate-300">Quick Test:</span>
          <div className="flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => onSelectSyntheticGesture('POINT_UP')}
              className="px-2 py-0.5 text-[11px] font-mono rounded bg-slate-800/90 hover:bg-cyan-950 hover:text-cyan-300 text-slate-300 border border-slate-700/60 transition-colors"
            >
              Forward (Point Up)
            </button>
            <button
              type="button"
              onClick={() => onSelectSyntheticGesture('POINT_LEFT')}
              className="px-2 py-0.5 text-[11px] font-mono rounded bg-slate-800/90 hover:bg-cyan-950 hover:text-cyan-300 text-slate-300 border border-slate-700/60 transition-colors"
            >
              Left
            </button>
            <button
              type="button"
              onClick={() => onSelectSyntheticGesture('POINT_RIGHT')}
              className="px-2 py-0.5 text-[11px] font-mono rounded bg-slate-800/90 hover:bg-cyan-950 hover:text-cyan-300 text-slate-300 border border-slate-700/60 transition-colors"
            >
              Right
            </button>
            <button
              type="button"
              onClick={() => onSelectSyntheticGesture('OPEN_PALM')}
              className="px-2 py-0.5 text-[11px] font-mono rounded bg-red-950/70 hover:bg-red-900/80 text-red-300 border border-red-800/60 transition-colors"
            >
              Stop (Open Palm)
            </button>
            <button
              type="button"
              onClick={() => onSelectSyntheticGesture('PINCH')}
              className="px-2 py-0.5 text-[11px] font-mono rounded bg-amber-950/70 hover:bg-amber-900/80 text-amber-300 border border-amber-800/60 transition-colors"
            >
              Drill (Pinch)
            </button>
          </div>
        </div>

        <div className="text-[11px] font-mono text-slate-500">
          Mirrored Selfie View · 21 Landmark Track
        </div>
      </div>
    </div>
  );
};
