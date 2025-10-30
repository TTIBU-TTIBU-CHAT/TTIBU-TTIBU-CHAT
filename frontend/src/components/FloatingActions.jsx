export default function FloatingActions({ onOpenChat, onClickOne, onClickTwo }) {
  return (
    <div className="fixed right-4 top-6 z-[1000] flex flex-col items-center gap-3 pointer-events-none">
      <button
        type="button"
        aria-label="버튼1"
        onClick={onClickOne}
        className="pointer-events-auto h-11 w-11 rounded-full bg-white shadow-xl border
                   flex items-center justify-center hover:shadow-2xl transition
                   hover:ring-2 hover:ring-black/10"
      >
        <span className="text-xl">🗂️</span>
      </button>

      <button
        type="button"
        aria-label="버튼2"
        onClick={onClickTwo}
        className="pointer-events-auto h-11 w-11 rounded-full bg-white shadow-xl border
                   flex items-center justify-center hover:shadow-2xl transition
                   hover:ring-2 hover:ring-black/10"
      >
        <span className="text-xl">🔗</span>
      </button>

      {/* ✅ 맨 아래: 채팅 열기 */}
      <button
        type="button"
        aria-label="채팅 열기"
        onClick={onOpenChat}
        className="pointer-events-auto h-11 w-11 rounded-full bg-white shadow-xl border
                   flex items-center justify-center hover:shadow-2xl transition
                   hover:ring-2 hover:ring-black/10"
      >
        <span className="text-xl">💬</span>
      </button>
    </div>
  );
}
