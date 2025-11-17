import { useState } from "react";
import * as S from "./GroupList.styles";
import ListItem from "@/components/common/ListItem";
import { useNavigate } from "@tanstack/react-router";
import { useGroups, useDeleteGroup } from "@/hooks/useGroups";
import GroupListModal from "@/components/GroupListModal";

export default function GroupList() {
  const navigate = useNavigate();
  const { data: groups = [], isLoading } = useGroups();
  const deleteGroup = useDeleteGroup();
  const [modalMode, setModalMode] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const handleOpenModal = (mode, group) => {
    setModalMode(mode);
    setSelectedGroup(group);
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setSelectedGroup(null);
  };

  const handleDelete = async (groupId) => {
    if (confirm("정말 이 그룹을 삭제할까요?")) {
      console.log(groupId);
      await deleteGroup.mutateAsync(groupId);
      alert("삭제 완료!");
    }
  };

  const handleClickGroup = (id) => {
    navigate({ to: `/groups/${id}` });
  };

  if (isLoading) return <div>로딩 중...</div>;

  return (
    <S.Container>
      <S.Title>그룹 목록</S.Title>

      {/* <S.CreateButton onClick={() => handleOpenModal("create")}>
        + 새 그룹 만들기
      </S.CreateButton> */}

      {groups.length === 0 ? (
        <div>생성된 그룹이 없습니다.</div>
      ) : (
        groups.map((group) => (
          <S.GroupItem key={group.groupId}>
            <ListItem
              title={group.name}
              summary={group.summary}
              tags={group.keyword}
              date={group.updated_at}
              onClick={() => handleClickGroup(group.groupId)}
              menu={{
                open: openMenuId === group.groupId,
                onRename: () => handleOpenModal("rename", group),
                onDelete: () => handleDelete(group.groupId),
              }}
              onMenuToggle={() => {
                setOpenMenuId((prev) =>
                  prev === group.groupId ? null : group.groupId
                );
              }}
            />
            {/* <S.ActionButtons>
              <button onClick={() => handleOpenModal("rename", group)}>
                이름 수정
              </button>
              <button onClick={() => handleOpenModal("update", group)}>
                그룹 수정
              </button>
              <button onClick={() => handleDelete(group.groupId)}>삭제</button>
            </S.ActionButtons> */}
          </S.GroupItem>
        ))
      )}

      {modalMode && (
        <GroupListModal
          mode={modalMode}
          initialData={selectedGroup}
          onClose={handleCloseModal}
        />
      )}
    </S.Container>
  );
}
