import { useState, useEffect } from "react";
import { Photo } from "../types";
import { getUnassignedThumbnailUrl } from "../services/api";

interface UnassignedData {
  total: number;
  assigned: number;
  unassignedCount: number;
  photos: Photo[];
}

interface Props {
  onClose: () => void;
}

export default function UnassignedPhotos({ onClose }: Props) {
  const [data, setData] = useState<UnassignedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/unassigned")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError("Failed to load unassigned photos."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-wedding-50">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-wedding-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-wedding-500 hover:text-wedding-700 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center">
            <h1 className="font-serif text-wedding-800 text-lg">Unassigned Photos</h1>
            <p className="text-wedding-500 text-sm">
              {data ? `${data.unassignedCount} photos without a face match` : "Loading..."}
            </p>
          </div>
          <div className="w-6"></div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading && (
          <div className="text-center py-20">
            <div className="w-12 h-12 border-4 border-wedding-200 border-t-wedding-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-wedding-500">Scanning photos...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-wedding-500 text-white rounded-lg hover:bg-wedding-600 transition-colors"
            >
              Go Back
            </button>
          </div>
        )}

        {data && !loading && (
          <>
            <div className="bg-wedding-100 rounded-xl p-4 mb-6 text-center">
              <p className="text-wedding-700 text-sm">
                <span className="font-semibold">{data.assigned}</span> photos assigned to people
                {" "}&bull;{" "}
                <span className="font-semibold text-wedding-500">{data.unassignedCount}</span> unassigned
                {" "}&bull;{" "}
                <span className="font-semibold">{data.total}</span> total
              </p>
            </div>

            {data.photos.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-serif text-wedding-800 mb-2">All caught up!</h2>
                <p className="text-wedding-500">Every photo has been assigned to a person.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
                {data.photos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="relative aspect-square rounded-xl overflow-hidden bg-wedding-100 animate-fade-in"
                    style={{ animationDelay: `${Math.min(index * 0.05, 1)}s` }}
                  >
                    <img
                      src={getUnassignedThumbnailUrl(photo.id)}
                      alt={`Unassigned photo ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute top-2 right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
