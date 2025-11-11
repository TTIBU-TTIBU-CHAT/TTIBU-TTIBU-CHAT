import * as S from './ChatRoomList.styles';
import ListItem from '@/components/common/ListItem';
import { useNavigate } from '@tanstack/react-router';
import { useRooms, useRenameRoom, useDeleteRoom } from '@/hooks/useChatRooms';
import InputDialog from '@/components/common/Modal/InputDialog';
import { useEffect, useMemo, useState } from 'react';

export default function ChatRoomList() {
  const navigate = useNavigate();

  // 목록
  const { data: rooms, isLoading, isError, error } = useRooms();

  // 액션 훅
  const renameMut = useRenameRoom();
  const deleteMut = useDeleteRoom();

  // 모달 상태 (이름 수정)
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameId, setRenameId] = useState(null);
  const [renameText, setRenameText] = useState('');

  // 방 이동
  const handleClickChat = (id) => {
    // 경로 표기 통일: /chatrooms/:id
    navigate({ to: `/chatrooms/${id}` });
  };

  // 케밥 메뉴 → 이름 수정
  const handleRequestRename = (id) => {
    const room = (rooms ?? []).find(
      (r) => String(r.id ?? r.room_id ?? r._id) === String(id)
    );
    setRenameId(id);
    setRenameText(room?.name ?? '');
    setRenameOpen(true);
  };

  // 케밥 메뉴 → 삭제
  const handleRequestDelete = (id) => {
    if (!id) return;
    const ok = window.confirm('이 채팅방을 삭제할까요?');
    if (!ok) return;
    deleteMut.mutate(id);
  };

  // 모달 저장
  const confirmRename = () => {
    const name = renameText.trim();
    if (!renameId || !name) return;
    renameMut.mutate({ roomId: renameId, name });
    setRenameOpen(false);
    setRenameId(null);
  };

  const list = useMemo(() => {
    const raw = Array.isArray(rooms) ? rooms : rooms?.rooms || [];
    return (raw || []).map((r) => ({
      id: r.id ?? r.room_id ?? r._id,
      title: r.name,
      summary: r.latest_question,
      date: r.updated_at,
      tags: r.keywords || r.tags || [],
    })).filter((x) => x && x.id);
  }, [rooms]);

  return (
    <S.Container>
      <S.Title>채팅방</S.Title>

      {/* 상태 */}
      {isLoading && <S.Hint>불러오는 중…</S.Hint>}
      {isError && <S.Hint style={{ color: '#b91c1c' }}>
        목록을 불러오지 못했습니다. {error?.message || ''}
      </S.Hint>}
      {!isLoading && !isError && list.length === 0 && (
        <S.Hint>채팅방이 없습니다. 새 채팅을 시작해 보세요.</S.Hint>
      )}

      {/* 목록 */}
      {list.map((chat) => (
        <ListItem
          key={chat.id}
          id={chat.id}
          title={chat.title}
          summary={chat.summary}
          tags={chat.tags}
          date={chat.date}
          onClick={() => handleClickChat(chat.id)}
          onRename={handleRequestRename}
          onDelete={handleRequestDelete}
        />
      ))}

      {/* 이름 수정 모달 */}
      <InputDialog
        open={renameOpen}
        title="채팅방 이름 수정"
        placeholder="새 이름을 입력하세요"
        value={renameText}
        setValue={setRenameText}
        onCancel={() => {
          setRenameOpen(false);
          setRenameId(null);
        }}
        onConfirm={confirmRename}
        confirmText={renameMut.isPending ? '저장 중…' : '저장'}
        disabled={renameMut.isPending}
      />
    </S.Container>
  );
}
