import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, AlertTriangle, Key, X } from 'lucide-react';
import { QRPairingPayload } from '../../services/deviceTransfer';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScannedPayload: (payload: QRPairingPayload) => void;
  onSwitchToPairingCode: () => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScannedPayload,
  onSwitchToPairingCode,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const tick = () => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(tick);
      return;
    }

    const video = videoRef.current;
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        try {
          const parsed = JSON.parse(code.data);
          if (
            parsed &&
            typeof parsed === 'object' &&
            parsed.type === 'ehsaan-play-pair' &&
            parsed.version === 1 &&
            parsed.sessionId &&
            parsed.deviceId &&
            parsed.pairingToken
          ) {
            stopCamera();
            onScannedPayload(parsed as QRPairingPayload);
            return;
          }
        } catch {
          // Ignore non-matching QR data
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(tick);
  };

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    setHasPermission(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setHasPermission(true);
        animationFrameRef.current = requestAnimationFrame(tick);
      }
    } catch {
      setHasPermission(false);
      setCameraError(
        'Camera permission is required to scan a QR code. You can also connect using a pairing code.'
      );
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-fade-in text-[var(--text-primary)]"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-[var(--modal-bg)] rounded-3xl shadow-2xl border border-[var(--border-subtle)] p-5 sm:p-6 space-y-4 animate-scale-up text-left overflow-hidden"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[var(--bg-card-olive)] text-[var(--text-card-olive)] flex items-center justify-center font-black">
              <Camera className="w-5 h-5 text-[var(--accent-primary)]" />
            </div>
            <div>
              <h3 className="text-base font-black text-[var(--text-primary)]">Scan QR Code</h3>
              <p className="text-xs text-[var(--text-secondary)]">Point your camera at the other device</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[var(--text-secondary)] hover:bg-[var(--chip-bg)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {hasPermission !== false ? (
          <div className="relative aspect-square w-full rounded-2xl bg-black overflow-hidden border border-[var(--border-subtle)] flex items-center justify-center">
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              muted
            />

            <div className="absolute inset-0 border-2 border-dashed border-[var(--accent-primary)]/40 rounded-2xl pointer-events-none p-8 flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-[var(--accent-primary)] rounded-2xl relative shadow-2xl">
                <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-[var(--accent-primary)] rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-[var(--accent-primary)] rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-[var(--accent-primary)] rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-[var(--accent-primary)] rounded-br-lg" />
                <div className="w-full h-0.5 bg-[var(--accent-primary)] animate-pulse shadow-[0_0_8px_rgba(234,179,8,0.8)] absolute top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="absolute bottom-3 left-0 right-0 text-center text-[11px] font-bold text-white drop-shadow bg-black/60 py-1 px-3 mx-auto w-fit rounded-full">
              Position QR code inside frame
            </div>
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs space-y-3 text-center">
            <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="font-bold text-rose-500 leading-relaxed">{cameraError}</p>
            <div className="flex gap-2 justify-center pt-1">
              <button
                type="button"
                onClick={startCamera}
                className="px-4 py-2 rounded-xl bg-[var(--accent-primary)] text-[var(--bg-primary)] font-bold active:scale-95"
              >
                Try Camera Again
              </button>
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  onSwitchToPairingCode();
                }}
                className="px-4 py-2 rounded-xl bg-[var(--chip-bg)] text-[var(--text-primary)] font-bold border border-[var(--border-subtle)] active:scale-95"
              >
                Use Pairing Code
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-1 text-xs">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onSwitchToPairingCode();
            }}
            className="text-[var(--accent-primary)] font-bold hover:underline flex items-center gap-1"
          >
            <Key className="w-3.5 h-3.5" />
            <span>Can't scan? Use 6-digit code</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[var(--chip-bg)] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
