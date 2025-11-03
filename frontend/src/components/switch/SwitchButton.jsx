import styled from "styled-components";

export default function SwitchButton({ on, onToggle, title }) {
  return (
    <Switch
      role="switch"
      aria-checked={on}
      $on={on}
      onClick={onToggle}
      title={title}
    >
      <SwitchLabelOn  $on={on}>ON</SwitchLabelOn>
      <SwitchLabelOff $on={on}>OFF</SwitchLabelOff>
      <Knob $on={on} />
    </Switch>
  );
}

/* === styles === */
const Switch = styled.button`
  all: unset;
  position: relative;
  width: 56px;
  height: 28px;
  border-radius: 9999px;
  background: ${({ $on }) => ($on ? "#4b6182" : "#c6c8cc")};
  border: 2px solid ${({ $on }) => ($on ? "#4b6182" : "#c6c8cc")};
  box-shadow: inset 0 0 0 1px rgba(0,0,0,.05), 0 3px 8px rgba(0,0,0,.08);
  cursor: pointer;
  transition: background .18s ease, border-color .18s ease;
`;

const Knob = styled.span`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  left: ${({ $on }) => ($on ? "calc(100% - 22px - 4px)" : "4px")};
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 3px 7px rgba(0,0,0,.18);
  transition: left .2s cubic-bezier(.22,.61,.36,1);
`;

const LabelBase = styled.span`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-weight: 900;
  letter-spacing: .3px;
  color: #fff;
  font-size: 11px;
  user-select: none;
  pointer-events: none;
  transition: opacity .15s ease;
`;
const SwitchLabelOn = styled(LabelBase)` left: 9px;  opacity: ${({ $on }) => ($on ? 1 : 0)}; `;
const SwitchLabelOff = styled(LabelBase)` right: 8px; opacity: ${({ $on }) => ($on ? 0 : 1)}; `;
