import { useEffect, useRef, useState } from "react";
import * as S from "./NewChat.styles";
import ModalShell from "@/components/ModalShell/ModalShell";
import { useSidebarStore } from "@/store/useSidebarStore";

export default function NewChat() {
  const { isCollapsed } = useSidebarStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const tagBoxRef = useRef(null);

  const openModal = (type) => {
    setModalType(type);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalType(null);
  };

  const handleSelect = (item) => {
    setSelectedItems((prev) =>
      prev.find((i) => i.id === item.id) ? prev : [...prev, item]
    );
  };

  const handleRemove = (id) => {
    setSelectedItems((prev) => prev.filter((i) => i.id !== id));
  };

  useEffect(() => {
    if (tagBoxRef.current) {
      tagBoxRef.current.scrollTo({
        top: tagBoxRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [selectedItems]);

  return (
    <S.Container $collapsed={isCollapsed}>
      <S.CenterBox>
        {selectedItems.length > 0 && (
          <S.SelectedRow ref={tagBoxRef}>
            {selectedItems.map((item) => (
              <S.SelectedTag key={item.id} $type={item.type}>
                {item.label}
                <button onClick={() => handleRemove(item.id)}>×</button>
              </S.SelectedTag>
            ))}
          </S.SelectedRow>
        )}

        <S.Input placeholder="무엇이든 물어보세요" />

        <S.ButtonRow>
          <S.SelectButton
            $active={modalType === "layers"}
            onClick={() => openModal("layers")}
          >
            그룹에서 선택
          </S.SelectButton>
          <S.SelectButton
            $active={modalType === "search"}
            onClick={() => openModal("search")}
          >
            기존 대화에서 선택
          </S.SelectButton>
        </S.ButtonRow>
      </S.CenterBox>

      {modalOpen && (
        <ModalShell
          open={modalOpen}
          onClose={closeModal}
          type={modalType}
          setType={setModalType}
          peek={false}
          showDock={false}
          onSelect={handleSelect}
        />
      )}
    </S.Container>
  );
}
