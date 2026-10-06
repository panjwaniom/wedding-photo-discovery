import { useState, useRef, useCallback } from "react";
import CameraCapture from "../components/CameraCapture";

interface Props {
  onUpload: (file: File) => void;
}

export default function LandingPage({ onUpload }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("Image is too large. Please choose a smaller photo (max 10MB).");
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleSubmit = () => {
    if (selectedFile) onUpload(selectedFile);
  };

  const clearPreview = () => {
    setPreview(null);
    setSelectedFile(null);
  };

  if (showCamera) {
    return (
      <CameraCapture
        onCapture={(file) => {
          setShowCamera(false);
          handleFile(file);
        }}
        onClose={() => setShowCamera(false)}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #FDF8F4 0%, #FADCD9 40%, #FAF0E6 100%)" }}>

      {/* Decorative floating elements */}
      <div className="float-mandala text-4xl top-[10%] left-[8%]">&#10048;</div>
      <div className="float-mandala text-2xl top-[20%] right-[15%]" style={{ animationDelay: "6s" }}>&#10048;</div>
      <div className="float-diamond top-[60%] left-[5%]" style={{ animationDelay: "3s" }}>&#9830;</div>
      <div className="float-diamond text-lg top-[75%] right-[10%]" style={{ animationDelay: "9s" }}>&#9830;</div>
      <div className="float-mandala text-3xl bottom-[15%] left-[20%]" style={{ animationDelay: "12s" }}>&#10048;</div>

      {/* Decorative circles */}
      <div className="absolute top-[-100px] right-[-100px] w-[400px] h-[400px] rounded-full border border-[#B8975A]/10 pointer-events-none" />
      <div className="absolute bottom-[-80px] left-[-80px] w-[300px] h-[300px] rounded-full border border-[#B8975A]/10 pointer-events-none" style={{ animationDelay: "4s" }} />

      <div className="max-w-md w-full text-center animate-fade-in relative z-10">
        {/* Mandala ornament */}
        <div className="text-[#B8975A] text-5xl mb-4 animate-spin-slow inline-block" style={{ animationDuration: "20s" }}>
          &#10048;
        </div>

        <p className="font-[Cormorant_Garamond] text-[#6B6058] text-xs tracking-[4px] uppercase mb-6">
          Find your moments
        </p>

        <div className="mb-8">
          <h1 className="font-[Great_Vibes] text-[#2A2520] text-5xl md:text-6xl mb-2 leading-tight">
            Wedding Photos
          </h1>
          <div className="flex items-center justify-center gap-4 my-4">
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-[#B8975A] to-transparent" />
            <span className="text-[#B8975A] text-xs animate-heartbeat inline-block">&#9830;</span>
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-[#B8975A] to-transparent" />
          </div>
          <p className="text-[#6B6058] text-base font-light tracking-wide">
            Find the photos you're in
          </p>
          <p className="text-[#B8975A] text-xs tracking-[3px] mt-3 font-medium">
            #SuruKiNikku
          </p>
        </div>

        <div className="mb-6">
          <p className="text-[#6B6058]/70 text-sm leading-relaxed font-light">
            Upload a clear selfie and we'll find your moments from the wedding.
          </p>
        </div>

        {/* Example selfie */}
        <div className="mb-8">
          <p className="text-[#B8975A] text-[10px] mb-3 uppercase tracking-[3px] font-medium">
            Good selfie examples
          </p>
          <div className="flex justify-center gap-3">
            <div className="w-24 h-24 rounded-2xl bg-white/60 border border-[#B8975A]/20 flex flex-col items-center justify-center shadow-sm">
              <svg className="w-8 h-8 text-[#B8975A]/60 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              <span className="text-[#6B6058]/60 text-[10px] leading-tight">Front-facing</span>
            </div>
            <div className="w-24 h-24 rounded-2xl bg-white/60 border border-[#B8975A]/20 flex flex-col items-center justify-center shadow-sm">
              <svg className="w-8 h-8 text-[#B8975A]/60 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span className="text-[#6B6058]/60 text-[10px] leading-tight">Good lighting</span>
            </div>
            <div className="w-24 h-24 rounded-2xl bg-white/60 border border-[#B8975A]/20 flex flex-col items-center justify-center shadow-sm">
              <svg className="w-8 h-8 text-[#B8975A]/60 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-[#6B6058]/60 text-[10px] leading-tight">Face visible</span>
            </div>
          </div>
        </div>

        {!preview ? (
          <div className="space-y-4">
            {/* Upload area */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative cursor-pointer rounded-2xl border-2 border-dashed p-10
                transition-all duration-300 ease-in-out
                ${
                  isDragging
                    ? "border-[#B8975A] bg-white/80 scale-[1.02]"
                    : "border-[#D4C4A0]/40 bg-white/50 hover:border-[#B8975A]/60 hover:bg-white/70"
                }
              `}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[#B8975A]/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-[#B8975A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[#2A2520] font-medium">
                    Tap to upload a selfie
                  </p>
                  <p className="text-[#6B6058]/60 text-sm mt-1">
                    or drag and drop
                  </p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </div>

            {/* Or divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#D4C4A0]/30 to-transparent" />
              <span className="text-[#B8975A]/60 text-xs">or</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#D4C4A0]/30 to-transparent" />
            </div>

            {/* Camera button */}
            <button
              onClick={() => setShowCamera(true)}
              className="w-full py-3.5 px-6 text-white rounded-xl font-medium
                hover:opacity-90 active:opacity-80 transition-all
                shadow-lg flex items-center justify-center gap-2 shimmer-btn"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
              Take a Selfie
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden bg-white shadow-lg">
              <img
                src={preview}
                alt="Your selfie"
                className="w-full h-64 object-cover"
              />
              <button
                onClick={clearPreview}
                className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="glass-card p-4 text-left">
              <p className="text-[#2A2520] text-sm font-medium mb-2">Tips for best results:</p>
              <ul className="text-[#6B6058] text-xs space-y-1">
                <li>Use a photo where your face is clearly visible</li>
                <li>Face the camera directly, avoid side angles</li>
                <li>Good lighting helps — avoid heavy shadows</li>
                <li>One face per photo works best</li>
              </ul>
            </div>

            <button
              onClick={handleSubmit}
              className="w-full py-3.5 px-6 text-white rounded-xl font-medium
                hover:opacity-90 active:opacity-80 transition-all
                shadow-lg btn-gold"
            >
              Find My Photos
            </button>

            <button
              onClick={clearPreview}
              className="w-full py-2 text-[#6B6058]/60 text-sm hover:text-[#6B6058] transition-colors"
            >
              Choose a different photo
            </button>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-[#D4C4A0]/20">
          <p className="text-[#6B6058]/50 text-xs">
            Your photo is only used to find your wedding photos.
          </p>
        </div>
      </div>
    </div>
  );
}
