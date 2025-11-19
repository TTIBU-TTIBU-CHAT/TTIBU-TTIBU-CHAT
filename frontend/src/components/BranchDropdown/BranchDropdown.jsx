import styled from "styled-components";

export default function BranchDropdown({
  label,
  items,
  open,
  setOpen,
  onSelect,
}) {
  console.log("BranchDropDown Items", items);
  return (
    <Wrap>
      <Title onClick={() => setOpen((v) => !v)}>{label}</Title>
      {open && (
        <Menu onMouseLeave={() => setOpen(false)}>
          {items.map((b) => (
            <Item
              key={b.value}
              $active={b.active}
              onClick={() => {
                console.log("브랜치 선택:", b);
                onSelect(b.value);
                setOpen(false);
              }}
            >
              {b.label}
              {b.active && <Check>✓</Check>}
            </Item>
          ))}
        </Menu>
      )}
    </Wrap>
  );
}

/* === styles === */
const Wrap = styled.div`
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 4;
`;

const Title = styled.button`
  all: unset;
  cursor: pointer;
  font-size: 15px;
  font-weight: 800;
  color: #2b3446;
  padding: 2px 4px;
  border-radius: 6px;
  transition:
    background 0.15s ease,
    color 0.15s ease;
  &:hover {
    background: rgba(0, 0, 0, 0.04);
  }
`;

const Menu = styled.ul`
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 140px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  box-shadow: 0 12px 20px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  padding: 4px 0;
  z-index: 10;
`;

const Item = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 7px 10px;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ $active }) => ($active ? "#111827" : "#374151")};
  background: ${({ $active }) =>
    $active ? "rgba(0,0,0,0.04)" : "transparent"};
  cursor: pointer;
  &:hover {
    background: rgba(0, 0, 0, 0.06);
  }
`;
const Check = styled.span`
  font-size: 12px;
`;
