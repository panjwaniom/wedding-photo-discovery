import { SearchResponse } from "../types";

const API_BASE = "/api";

export async function searchFace(file: File): Promise<SearchResponse> {
  const formData = new FormData();
  formData.append("photo", file);

  const response = await fetch(`${API_BASE}/search`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Search failed." }));
    throw new Error(error.detail || "Search failed.");
  }

  return response.json();
}

export function getThumbnailUrl(sessionId: string, photoId: string): string {
  return `${API_BASE}/results/${sessionId}/photos/${photoId}/thumbnail`;
}

export function getDownloadUrl(sessionId: string, photoId: string): string {
  return `${API_BASE}/results/${sessionId}/photos/${photoId}/download`;
}

export function getFullUrl(sessionId: string, photoId: string): string {
  return `${API_BASE}/results/${sessionId}/photos/${photoId}`;
}

export function getDownloadAllUrl(sessionId: string): string {
  return `${API_BASE}/results/${sessionId}/download-all`;
}

// iOS saves shared image files straight to Photos via "Save N Images".
// Two modes: "full" shares originals in small batches (best quality, but
// big files can exceed what the phone will share), "preview" shares
// phone-sized files (~300 KB each) that prepare in seconds and almost
// always succeed. The UI tries full first and drops to preview on failure.
export const FULL_SHARE_BATCH_SIZE = 5;
// 25 phone-sized files (~400 KB each ≈ 10 MB a batch) is the most the
// share sheet reliably takes in one go.
export const PREVIEW_SHARE_BATCH_SIZE = 25;

export type ShareQuality = "full" | "preview";

export function getPreviewUrl(sessionId: string, photoId: string): string {
  return `${API_BASE}/results/${sessionId}/photos/${photoId}/preview`;
}

// One photo that refuses to load must not sink the whole batch.
const FETCH_TIMEOUT_MS = 45000;

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function canSaveToPhotos(photoCount: number): boolean {
  return (
    isIOS() &&
    photoCount > 0 &&
    typeof navigator.share === "function"
  );
}

async function fetchPhotoFile(
  sessionId: string,
  photoId: string,
  quality: ShareQuality
): Promise<File | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const url =
      quality === "full"
        ? getFullUrl(sessionId, photoId)
        : getPreviewUrl(sessionId, photoId);
    const res = await fetch(url, {
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.size) return null;
    return new File([blob], `wedding_${photoId}.jpg`, {
      type: blob.type || "image/jpeg",
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export interface SaveResult {
  outcome: "shared" | "dismissed" | "failed";
  saved: number;
  skipped: number;
}

export async function savePhotosToDevice(
  sessionId: string,
  photos: { id: string }[],
  quality: ShareQuality,
  onProgress?: (done: number, total: number) => void
): Promise<SaveResult> {
  let done = 0;
  const fetched = await Promise.all(
    photos.map(async (p) => {
      const file = await fetchPhotoFile(sessionId, p.id, quality);
      done += 1;
      onProgress?.(done, photos.length);
      return file;
    })
  );

  const files = fetched.filter((f): f is File => f !== null);
  const skipped = fetched.length - files.length;

  if (files.length === 0) {
    return { outcome: "failed", saved: 0, skipped };
  }

  if (
    typeof navigator.canShare === "function" &&
    !navigator.canShare({ files })
  ) {
    return { outcome: "failed", saved: 0, skipped };
  }

  try {
    // Files-only payload: the most compatible form — some browsers and
    // targets reject mixed title+files payloads outright.
    await navigator.share({ files });
    return { outcome: "shared", saved: files.length, skipped };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { outcome: "dismissed", saved: 0, skipped };
    }
    return { outcome: "failed", saved: 0, skipped };
  }
}

export function getUnassignedThumbnailUrl(photoId: string): string {
  return `${API_BASE}/unassigned/photos/${photoId}/thumbnail`;
}
