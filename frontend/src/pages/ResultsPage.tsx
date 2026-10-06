import { useState } from "react";
import { SearchResponse } from "../types";
import {
  getDownloadAllUrl,
  canSaveToPhotos,
  savePhotosToDevice,
  FULL_SHARE_BATCH_SIZE,
  PREVIEW_SHARE_BATCH_SIZE,
  ShareQuality,
} from "../services/api";
import PhotoGrid from "../components/PhotoGrid";
import PhotoViewer from "../components/PhotoViewer";

interface Props {
  results: SearchResponse;
  onReset: () => void;
}

export default function ResultsPage({ results, onReset }: Props) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saveNote, setSaveNote] = useState("");
  const [savedCount, setSavedCount] = useState(0);
  const [quality, setQuality] = useState<ShareQuality>("full");
  const [allSaved, setAllSaved] = useState(false);

  const showSaveButton = canSaveToPhotos(results.photoCount);
  const batchSize =
    quality === "full" ? FULL_SHARE_BATCH_SIZE : PREVIEW_SHARE_BATCH_SIZE;
  const batchPhotos = results.photos.slice(savedCount, savedCount + batchSize);
  const batchEnd = savedCount + batchPhotos.length;
  const remainingBatches = Math.ceil(
    (results.photoCount - savedCount) / batchSize
  );

  const saveLabel =
    quality === "full"
      ? `Save Photos (${savedCount + 1}–${batchEnd} of ${results.photoCount})`
      : `Save Quick (${savedCount + 1}–${batchEnd} of ${results.photoCount})`;

  const handleSaveToPhotos = async () => {
    setSaving(true);
    setSaveError("");
    setSaveNote("");
    setSaveProgress("Preparing…");
    const res = await savePhotosToDevice(
      results.sessionId,
      batchPhotos,
      quality,
      (done, total) => setSaveProgress(`Preparing ${done}/${total}…`)
    );
    setSaving(false);
    setSaveProgress("");
    if (res.outcome === "shared") {
      const next = savedCount + batchPhotos.length;
      setSavedCount(next);
      if (next >= results.photoCount) {
        setAllSaved(true);
      }
      if (res.skipped > 0) {
        setSaveNote(
          `Saved ${res.saved} ✓ — ${res.skipped} wouldn't load, skipped.`
        );
      }
    } else if (res.outcome === "failed") {
      if (quality === "full") {
        // This phone won't take full-res shares — drop to the quick
        // version and continue from the same spot on the next tap.
        setQuality("preview");
        setSaveNote(
          "Full quality wouldn't open on this phone — switched to the quick version. Tap to continue."
        );
      } else {
        setSaveError("Couldn't open the share sheet — use Download All (.zip) instead.");
      }
    }
    // "dismissed" stays on the same batch so you can retry it.
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #FDF8F4 0%, #FAF0E6 100%)" }}>
      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-md border-b border-[#D4C4A0]/20">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={onReset}
            className="text-[#B8975A] hover:text-[#9A7D4A] transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center">
            <h1 className="font-[Great_Vibes] text-[#2A2520] text-xl">
              {results.personName || "Your Photos"}
            </h1>
            <p className="text-[#6B6058] text-sm font-light">{results.photoCount} photos found</p>
            <p className="text-[#B8975A]/70 text-[10px] tracking-[2px] mt-0.5">#SuruKiNikku</p>
          </div>
          <div className="w-6"></div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="text-center mb-8 animate-fade-in">
          <p className="text-[#6B6058] text-lg font-light">
            {results.personName
              ? <>Hey <span className="font-semibold text-[#2A2520]">{results.personName}</span>, we found your photos!</>
              : <>We found your photos <span className="text-[#B8975A]">&#10084;</span></>
            }
          </p>
          <div className="mx-auto max-w-md mt-5 flex items-start gap-2.5 text-left bg-[#B8975A]/10 border border-[#B8975A]/40 rounded-xl px-4 py-3">
            <svg className="w-5 h-5 shrink-0 mt-0.5 text-[#B8975A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-[#6B6058] text-[13px] leading-relaxed">
              <span className="font-semibold text-[#2A2520]">About quality: </span>
              quick save stores phone-size copies. For full quality, tap any
              photo to open it, then <span className="font-medium text-[#2A2520]">touch &amp; hold → Save</span> —
              or grab everything below as a zip.
            </p>
          </div>

          <div className="mt-4 flex flex-col items-center gap-2">
            {showSaveButton && !allSaved && (
              <button
                onClick={handleSaveToPhotos}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-3 text-white rounded-xl font-medium
                  hover:opacity-90 active:opacity-80 transition-all shadow-lg btn-gold text-sm
                  disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {saveProgress || "Preparing…"}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m4 4V4" />
                    </svg>
                    {savedCount > 0 ? `Saved ✓ — next: ${saveLabel}` : saveLabel}
                  </>
                )}
              </button>
            )}
            {showSaveButton && allSaved && (
              <p className="text-[#2A2520] text-sm font-medium">
                All {results.photoCount} photos saved ✓
              </p>
            )}
            <a
              href={getDownloadAllUrl(results.sessionId)}
              download="wedding-photos.zip"
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm
                transition-all shadow
                ${showSaveButton
                  ? "bg-white/70 text-[#6B6058] border border-[#D4C4A0]/30 hover:bg-white"
                  : "text-white hover:opacity-90 active:opacity-80 shadow-lg btn-gold"}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download All (.zip)
            </a>
            {showSaveButton && !allSaved && (
              <p className="text-[#6B6058]/50 text-[11px]">
                {quality === "full"
                  ? "Full quality, a few taps · full zip below too"
                  : "Quick version — full quality always in the zip below"}
              </p>
            )}
            {saveNote && !saving && (
              <p className="text-[#6B6058] text-xs">{saveNote}</p>
            )}
            {saveError && (
              <p className="text-red-500/80 text-xs">{saveError}</p>
            )}
          </div>
        </div>

        <PhotoGrid
          photos={results.photos}
          sessionId={results.sessionId}
          onPhotoClick={setSelectedPhotoIndex}
        />
      </main>

      {selectedPhotoIndex !== null && (
        <PhotoViewer
          photos={results.photos}
          currentIndex={selectedPhotoIndex}
          sessionId={results.sessionId}
          onClose={() => setSelectedPhotoIndex(null)}
        />
      )}
    </div>
  );
}
