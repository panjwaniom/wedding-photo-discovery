export default function LoadingState() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #FDF8F4 0%, #FADCD9 40%, #FAF0E6 100%)" }}>

      {/* Decorative elements */}
      <div className="float-mandala text-4xl top-[15%] left-[10%]">&#10048;</div>
      <div className="float-diamond bottom-[20%] right-[15%]" style={{ animationDelay: "4s" }}>&#9830;</div>

      <div className="max-w-md w-full text-center animate-fade-in relative z-10">
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto mb-6 relative">
            <div className="absolute inset-0 rounded-full border-4 border-[#D4C4A0]/30"></div>
            <div className="absolute inset-0 rounded-full border-4 border-[#B8975A] border-t-transparent animate-spin-slow"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[#B8975A] text-2xl animate-heartbeat">&#10048;</span>
            </div>
          </div>
          <h2 className="font-[Great_Vibes] text-[#2A2520] text-3xl mb-4">
            Finding your photos...
          </h2>
        </div>

        <div className="space-y-3 text-[#6B6058]">
          <p className="animate-pulse-soft font-light">Analyzing your face</p>
          <p className="animate-pulse-soft font-light" style={{ animationDelay: "0.5s" }}>
            Finding matching wedding photos
          </p>
          <p className="animate-pulse-soft font-light" style={{ animationDelay: "1s" }}>
            Almost there...
          </p>
        </div>
      </div>
    </div>
  );
}
