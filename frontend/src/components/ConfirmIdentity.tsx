interface Props {
  personName: string;
  onYes: () => void;
  onNo: () => void;
  onReset: () => void;
}

export default function ConfirmIdentity({ personName, onYes, onNo, onReset }: Props) {
  const initials = personName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #FDF8F4 0%, #FADCD9 40%, #FAF0E6 100%)" }}>

      {/* Decorative elements */}
      <div className="float-mandala text-4xl top-[10%] left-[8%]">&#10048;</div>
      <div className="float-diamond top-[60%] right-[12%]" style={{ animationDelay: "6s" }}>&#9830;</div>

      <div className="max-w-md w-full text-center animate-fade-in relative z-10">
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#B8975A] to-[#9A7D4A] flex items-center justify-center text-white text-2xl font-[Great_Vibes] shadow-lg">
            {initials || "?"}
          </div>
          <h2 className="font-[Great_Vibes] text-[#2A2520] text-3xl mb-3">
            Is this you?
          </h2>
          <p className="text-[#6B6058] text-lg font-light">
            We think your name is{" "}
            <span className="font-semibold text-[#2A2520]">{personName}</span>
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={onYes}
            className="w-full py-3.5 px-6 text-white rounded-xl font-medium
              hover:opacity-90 active:opacity-80 transition-all shadow-lg btn-gold"
          >
            Yes, that's me!
          </button>
          <button
            onClick={onNo}
            className="w-full py-3.5 px-6 bg-white/70 text-[#6B6058] rounded-xl font-medium
              border border-[#D4C4A0]/30 hover:bg-white active:bg-white/90
              transition-colors backdrop-blur-sm"
          >
            No, that's not me
          </button>
        </div>

        <button
          onClick={onReset}
          className="mt-6 text-[#6B6058]/50 text-sm hover:text-[#6B6058] transition-colors"
        >
          Start over
        </button>
      </div>
    </div>
  );
}
