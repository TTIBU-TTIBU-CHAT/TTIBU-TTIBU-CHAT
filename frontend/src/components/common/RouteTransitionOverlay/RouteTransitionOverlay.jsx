// components/common/RouteTransitionOverlay.jsx
import { createPortal } from "react-dom";

export default function RouteTransitionOverlay({
  show,
  message = "대화를 여는 중...",
}) {
  if (!show) return null;
  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.28)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        backdropFilter: "blur(1px)",
      }}
    >
      <div
        style={{
          minWidth: 260,
          maxWidth: "80vw",
          padding: "20px 24px",
          borderRadius: 14,
          background: "#fff",
          boxShadow: "0 18px 44px rgba(16,24,40,0.2)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontSize: 15,
          color: "#111827",
        }}
      >
        {/* FontAwesome 쓰고 계시길래 동일 스타일로 */}
        <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 18 }} />
        <span>{message}</span>
      </div>
    </div>,
    document.body
  );
}
