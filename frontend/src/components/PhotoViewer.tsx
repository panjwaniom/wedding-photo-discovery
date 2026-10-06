import { useState, useEffect, useCallback, useRef } from "react";
import { getFullUrl, getDownloadUrl } from "../services/api";
import { Photo } from "../types";

interface Props {
  photos: Photo[];
  currentIndex: number;
  sessionId: string;
  onClose: () => void;
}

export default function PhotoViewer({
  photos,
  currentIndex,
  sessionId,
  onClose,
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [idx, setIdx] = useState(currentIndex);
  const [saving, setSaving] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const swiping = useRef<boolean>(false);

  const photo = photos[idx];

  const goNext = useCallback(() => {
    if (idx < photos.length - 1) {
      setLoaded(false);
      setDragX(0);
      setIdx((i) => i + 1);
    } else {
      setDragX(0);
    }
  }, [idx, photos.length]);

  const goPrev = useCallback(() => {
    if (idx > 0) {
      setLoaded(false);
      setDragX(0);
      setIdx((i) => i - 1);
    } else {
      setDragX(0);
    }
  }, [idx]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goNext();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose, goNext, goPrev]);

  const SWIPE_THRESHOLD = 60;

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartX.current = t.clientX;
    touchStartY.current = t.clientY;
    swiping.current = false;
    setDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0];
    const dx = t.clientX - touchStartX.current;
    const dy = t.clientY - touchStartY.current;
    // Lock to horizontal swipes so vertical scrolls/page gestures are untouched
    if (!swiping.current && Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
      swiping.current = false;
      setDragging(false);
      setDragX(0);
      return;
    }
    if (Math.abs(dx) > 8) swiping.current = true;
    if (swiping.current) setDragX(dx);
  };

  const onTouchEnd = () => {
    setDragging(false);
    if (swiping.current) {
      if (dragX <= -SWIPE_THRESHOLD) goNext();
      else if (dragX >= SWIPE_THRESHOLD) goPrev();
      else setDragX(0);
    } else {
      setDragX(0);
    }
    swiping.current = false;
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  const handleSave = async () => {
    if (!photo) return;
    setSaving(true);

    try {
      const imageUrl = getFullUrl(sessionId, photo.id);

      if (isIOS && navigator.share) {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], `wedding_${photo.id}.jpg`, { type: "image/jpeg" });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: "Wedding Photo",
          });
          setSaving(false);
          return;
        }
      }

      // Fallback: open in new tab (iOS user can long-press to save to Photos)
      const link = document.createElement("a");
      link.href = getDownloadUrl(sessionId, photo.id);
      link.download = `wedding_${photo.id}.jpg`;
      link.target = "_blank";
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      // User cancelled share or download failed — open in new tab as fallback
      window.open(getFullUrl(sessionId, photo.id), "_blank");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex flex-col select-none"
      style={{ touchAction: "pan-y" }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <button
          onClick={onClose}
          className="w-10 h-10 bg-white/10 rounded-full
            flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-white text-sm">
          {idx + 1} / {photos.length}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-white/10 rounded-full
            flex items-center gap-2 text-white hover:bg-white/20 transition-colors text-sm disabled:opacity-50"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          )}
          Save
        </button>
      </div>

      {/* Image area */}
      <div className="flex-1 flex items-center justify-center px-4 min-h-0 relative">
        {/* Previous button */}
        {idx > 0 && (
          <button
            onClick={goPrev}
            className="absolute left-2 z-10 w-10 h-10 bg-black/40 rounded-full
              flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {!loaded && (
          <div className="absolute w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin-slow" />
        )}
        <img
          key={photo.id}
          src={getFullUrl(sessionId, photo.id)}
          alt="Wedding photo"
          draggable={false}
          className={`max-w-full max-h-full object-contain rounded-lg ${
            dragging ? "" : "transition-all duration-300"
          } ${loaded ? "opacity-100" : "opacity-0 absolute"}`}
          style={{ transform: `translateX(${dragX}px)` }}
          onLoad={() => setLoaded(true)}
        />

        {/* Next button */}
        {idx < photos.length - 1 && (
          <button
            onClick={goNext}
            className="absolute right-2 z-10 w-10 h-10 bg-black/40 rounded-full
              flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Swipe hint + iOS hint */}
      <div className="shrink-0 text-center pb-3 text-white/30 text-xs space-y-1">
        {photos.length > 1 && (
          <div>&larr; Swipe to browse &rarr;</div>
        )}
        {isIOS && (
          <div className="text-white/60 font-medium">
            Best quality: touch &amp; hold the photo → Save to Photos
          </div>
        )}
      </div>
    </div>
  );
}
