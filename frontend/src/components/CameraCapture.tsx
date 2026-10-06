import { useState, useRef, useCallback, useEffect } from "react";

interface Props {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export default function CameraCapture({ onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string>("");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [ready, setReady] = useState(false);
  const [permissionState, setPermissionState] = useState<"prompt" | "granted" | "denied">("prompt");

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async (facing: "user" | "environment") => {
    try {
      // Camera API only exists in secure contexts (https or localhost).
      // Plain http://192.168.x.x on phones has no camera API at all.
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setPermissionState("denied");
        setCameraError(
          window.isSecureContext
            ? "This browser can't access the camera. Please try Chrome (Android) or Safari (iPhone)."
            : "Camera needs a secure connection. Please open the app using its https link (not the http://192.168 address) and try again."
        );
        return;
      }

      stopStream();

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = mediaStream;
      setPermissionState("granted");
      setCameraError("");
      setReady(false);
      // NOTE: the <video> element is NOT mounted yet on first enable
      // (permission screen renders instead), so attaching happens in the
      // effect below once the video element exists.
    } catch (err: unknown) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setPermissionState("denied");
        setCameraError(
          "Camera access was denied. Please allow camera access in your browser/OS settings and reload."
        );
      } else if (name === "NotFoundError") {
        setCameraError("No camera found on this device.");
      } else if (name === "NotReadableError" || name === "AbortError") {
        setCameraError("Camera is busy or couldn't start. Close other apps using the camera and try again.");
      } else {
        setCameraError("Could not access camera. If you're on http://192.168.x.x, switch to the https link instead.");
      }
    }
  }, [stopStream]);

  useEffect(() => {
    return () => stopStream();
  }, [stopStream]);

  // Attach the live stream to the <video> element whenever it (re)mounts
  // or the stream changes (first enable, camera flip) and get frames
  // flowing. Two iOS gotchas handled here:
  //  1. React's `muted` *attribute* does not set the video *property* iOS
  //     checks — without video.muted = true, play() outside the tap
  //     gesture is rejected and the screen stays black.
  //  2. play() can reject while the camera is still warming up, so retry
  //     until the video is actually playing.
  useEffect(() => {
    if (permissionState !== "granted" || cameraError) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;

    let cancelled = false;
    let retries = 0;
    setReady(false);

    video.muted = true;
    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    const tryPlay = () => {
      if (cancelled) return;
      let pr: Promise<void> | undefined;
      try {
        pr = video.play();
      } catch {
        pr = undefined;
      }
      if (pr && typeof pr.catch === "function") {
        pr.then(() => {
          if (!cancelled) setReady(true);
        }).catch(() => {
          if (!cancelled && retries < 8) {
            retries += 1;
            setTimeout(tryPlay, 350);
          }
        });
      } else if (!cancelled) {
        setReady(true);
      }
    };

    if (video.readyState >= 2) {
      tryPlay();
    } else {
      video.onloadedmetadata = tryPlay;
      // Safety net: if the event already fired before we subscribed,
      // kick playback on the next tick instead of hanging on black.
      setTimeout(() => {
        if (!cancelled && video.paused && retries === 0) tryPlay();
      }, 800);
    }

    return () => {
      cancelled = true;
    };
  }, [permissionState, cameraError, facingMode]);

  const handleRequestPermission = () => {
    startCamera(facingMode);
  };

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], "selfie.jpg", {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          stopStream();
          onCapture(file);
        }
      },
      "image/jpeg",
      0.92
    );
  };

  const toggleCamera = () => {
    const newFacing = facingMode === "user" ? "environment" : "user";
    setFacingMode(newFacing);
    startCamera(newFacing);
  };

  // Permission request screen
  if (permissionState === "prompt" && !cameraError) {
    return (
      <div className="fixed inset-0 z-50 bg-wedding-900 flex flex-col items-center justify-center px-6">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center max-w-sm animate-fade-in">
          <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-wedding-500/20 flex items-center justify-center">
            <svg className="w-12 h-12 text-wedding-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
          </div>

          <h2 className="text-2xl font-serif text-white mb-3">Take a Selfie</h2>
          <p className="text-wedding-300 text-sm mb-6 leading-relaxed">
            We need access to your camera to take a selfie for photo matching.
            Your camera will only be used while this page is open.
          </p>

          <div className="bg-white/5 rounded-xl p-4 mb-8 text-left">
            <p className="text-wedding-200 text-xs font-medium mb-2 uppercase tracking-wider">Tips for a great selfie:</p>
            <ul className="text-wedding-300 text-xs space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-wedding-400 mt-0.5">&#10003;</span>
                Face the camera directly — avoid side angles
              </li>
              <li className="flex items-start gap-2">
                <span className="text-wedding-400 mt-0.5">&#10003;</span>
                Stand in bright, even light (face a window or lamp)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-wedding-400 mt-0.5">&#10003;</span>
                Remove sunglasses — keep eyes clearly visible
              </li>
              <li className="flex items-start gap-2">
                <span className="text-wedding-400 mt-0.5">&#10003;</span>
                Hold the phone at eye level, one face in frame
              </li>
              <li className="flex items-start gap-2">
                <span className="text-wedding-400 mt-0.5">&#10003;</span>
                Avoid heavy shadows, backlight &amp; filters
              </li>
            </ul>
          </div>

          <button
            onClick={handleRequestPermission}
            className="w-full py-3.5 bg-wedding-500 text-white rounded-xl font-medium
              hover:bg-wedding-600 active:bg-wedding-700 transition-colors shadow-lg"
          >
            Enable Camera
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 z-10">
        <button
          onClick={() => {
            stopStream();
            onClose();
          }}
          className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <button
          onClick={toggleCamera}
          className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
        </button>
      </div>

      {/* Camera view with face guide */}
      <div className="flex-1 relative overflow-hidden min-h-0">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Face guide overlay — one single circle, everything else sits below it */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-6">
          {/* White circle guide (the box-shadow dims everything outside it) */}
          <div
            className={`w-56 h-56 md:w-64 md:h-64 rounded-full border-[3px] shrink-0 transition-colors duration-300 ${
              ready ? "border-white/80 animate-face-guide" : "border-white/30"
            }`}
            style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)" }}
          />

          {!ready && (
            <div className="relative z-10 mt-6 text-white/60 text-sm">Starting camera...</div>
          )}

          {ready && (
            <>
              <div className="relative z-10 mt-6 text-white/80 text-sm text-center leading-relaxed">
                Position your face
                <br />
                inside the circle
              </div>

              {/* Tips below the circle */}
              <div className="relative z-10 mt-4 flex gap-4 text-white/50 text-[10px]">
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  Face forward
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  Good light
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Neutral face
                </span>
              </div>
            </>
          )}
        </div>

        {/* Camera error */}
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 px-6 z-20">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.198 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
                </svg>
              </div>
              <p className="text-white mb-4">{cameraError}</p>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setCameraError("");
                    startCamera(facingMode);
                  }}
                  className="w-full px-6 py-2 bg-white/20 rounded-lg text-white hover:bg-white/30 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => {
                    stopStream();
                    onClose();
                  }}
                  className="w-full px-6 py-2 text-white/60 hover:text-white transition-colors text-sm"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Capture button */}
      <div className="shrink-0 flex justify-center py-6 bg-black z-10">
        <button
          onClick={handleCapture}
          disabled={!ready}
          className="rounded-full bg-white border-4 border-white/30
            flex items-center justify-center hover:scale-105 active:scale-95
            transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ width: 72, height: 72 }}
        >
          <div className="w-14 h-14 rounded-full bg-white border-2 border-gray-200" />
        </button>
      </div>
    </div>
  );
}
