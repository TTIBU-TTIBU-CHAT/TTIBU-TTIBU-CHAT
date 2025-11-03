import styled from "styled-components";
import SwitchButton from "@/components/switch/SwitchButton";

export default function TopleftCard({
  editMode,
  setEditMode,
  onSave,
  onInit,
  canReset = false,   // ✅ 추가: 초기화 가능 여부
}) {
  return (
    <Card>
      <PillRow>
        <PillBtn onClick={onSave}>저장</PillBtn>
        <PillBtn $ghost disabled={!canReset} onClick={canReset ? onInit : undefined}>
          초기화
        </PillBtn>
      </PillRow>

      <SwitchRow>
        <SwitchText>편집 모드</SwitchText>
        <SwitchButton
          on={editMode}
          onToggle={() => setEditMode((v) => !v)}
          title={editMode ? "편집 모드 ON" : "편집 모드 OFF"}
        />
      </SwitchRow>
    </Card>
  );
}

/* === styles === */
const Card = styled.div`
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 4;
  width: 248px;
  padding: 12px 14px;
  border-radius: 12px;
  background: #f1f4f8;
  border: 1px solid rgba(0,0,0,0.08);
  box-shadow: 0 8px 14px rgba(0,0,0,0.10);
  display: grid;
  gap: 8px;
`;
const PillRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;
const PillBtn = styled.button`
  height: 34px;
  border: 0;
  border-radius: 14px;
  font-weight: 800;
  font-size: 12.5px;
  color: #fff;
  background: ${({ $ghost }) => ($ghost ? "#e9eaec" : "#5a6f8e")};
  opacity: ${({ disabled }) => (disabled ? 0.6 : 1)};
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  transition: filter .15s ease;
  &:hover { filter: ${({ disabled }) => (disabled ? "none" : "brightness(1.06)")}; }
`;
const SwitchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;
const SwitchText = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: #2b374b;
`;
