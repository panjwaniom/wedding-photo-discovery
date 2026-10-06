interface Props {
  message: string;
  onReset: () => void;
}

export default function ErrorState({ message, onReset }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #FDF8F4 0%, #FADCD9 40%, #FAF0E6 100%)" }}>

      {/* Decorative elements */}
      <div className="float-mandala text-4xl top-[15%] right-[10%]">&#10048;</div>
      <div className="float-diamond bottom-[25%] left-[12%]" style={{ animationDelay: "5s" }}>&#9830;</div>

      <div className="max-w-md w-full text-center animate-fade-in relative z-10">
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#F4C2C2]/30 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-[#BC8F8F]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </div>
          <h2 className="font-[Great_Vibes] text-[#2A2520] text-3xl mb-4">
            Oops
          </h2>
          <p className="text-[#6B6058] leading-relaxed font-light">{message}</p>
        </div>

        <button
          onClick={onReset}
          className="py-3 px-8 text-white rounded-xl font-medium
            hover:opacity-90 active:opacity-80 transition-all
            shadow-lg btn-gold"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
