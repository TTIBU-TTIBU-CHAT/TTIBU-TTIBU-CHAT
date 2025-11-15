import * as S from './ChatRoomList.styles';
import ListItem from '@/components/common/ListItem';
import { useNavigate } from '@tanstack/react-router';
import { useRooms, useRenameRoom, useDeleteRoom } from '@/hooks/useChatRooms';
import InputDialog from '@/components/common/Modal/InputDialog';
import { useMemo, useState } from 'react';

// 날짜 포맷
function formatDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return iso;
  }
}
function normalizeRooms(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.rooms)) return raw.rooms;
  return [];
}
function mapRoom(r) {
  const id = r.id ?? r.room_id ?? r._id ?? r.roomUid;
  const rawDate = r.updated_at ?? r.updatedAt ?? r.modifiedAt ?? r.created_at;
  return {
    id,
    title: r.name ?? r.title ?? '이름 없는 채팅',
    summary: r.latest_question ?? r.summary ?? r.lastMessage ?? '',
    date: formatDate(rawDate),
    tags: r.keywords ?? r.tags ?? [],
    _raw: r,
  };
}

export default function ChatRoomList() {
  const navigate = useNavigate();
  const { data: roomsRaw, isLoading, isError, error } = useRooms();

  const renameMut = useRenameRoom();
  const deleteMut = useDeleteRoom();

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameId, setRenameId] = useState(null);
  const [renameText, setRenameText] = useState("");

  // ✅ 케밥 메뉴 열림 상태 (아이템 id 저장)
  const [menuOpenId, setMenuOpenId] = useState(null);

  const list = useMemo(() => {
    const arr = normalizeRooms(roomsRaw).map(mapRoom);
    return arr.sort((a, b) => {
      const ta = new Date(a._raw?.updated_at ?? a._raw?.created_at ?? 0);
      const tb = new Date(b._raw?.updated_at ?? b._raw?.created_at ?? 0);
      return tb - ta;
    });
  }, [roomsRaw]);

  const handleClickChat = (id) =>
    navigate({ to: '/chatrooms/$nodeId', params: { nodeId: String(id) } });

  const handleRequestRename = (id) => {
    const found = list.find((r) => String(r.id) === String(id));
    setRenameId(id);
    setRenameText(found?.title ?? '');
    setRenameOpen(true);
    setMenuOpenId(null); // 메뉴 닫기
  };

  const handleRequestDelete = (id) => {
    if (!id || deleteMut.isPending) return;
    if (window.confirm('이 채팅방을 삭제할까요?')) {
      deleteMut.mutate(id);
      setMenuOpenId(null); // 메뉴 닫기
    }
  };

  const confirmRename = () => {
    const name = renameText.trim();
    if (!renameId || !name || renameMut.isPending) return;
    renameMut.mutate({ roomId: renameId, name });
    setRenameOpen(false);
    setRenameId(null);
  };

  // ✅ 바깥 클릭 시 메뉴 닫고 싶다면, 상위에서 useEffect로 document 클릭 리스너 추가해도 됨.

  return (
    <S.Container>
      <S.Title>채팅방</S.Title>

      {isLoading && <S.Hint>불러오는 중…</S.Hint>}
      {isError && (
        <S.Hint style={{ color: '#b91c1c' }}>
          목록을 불러오지 못했습니다. {error?.message || ''}
        </S.Hint>
      )}
      {!isLoading && !isError && list.length === 0 && (
        <S.Hint>채팅방이 없습니다. 새 채팅을 시작해 보세요.</S.Hint>
      )}

      {list.map((chat) => (
        <ListItem
          key={chat.id}
          id={chat.id}
          title={chat.title}
          summary={chat.summary}
          tags={chat.tags}
          date={chat.date}
          onClick={() => handleClickChat(chat.id)}
          /* ✅ 케밥 메뉴 전달 */
          menu={{
            open: menuOpenId === chat.id,
            onRename: () => handleRequestRename(chat.id),
            onDelete: () => handleRequestDelete(chat.id),
          }}
          onMenuToggle={(e) => {
            e?.stopPropagation?.();
            setMenuOpenId((prev) => (prev === chat.id ? null : chat.id));
          }}
        />
      ))}

      <InputDialog
        open={renameOpen}
        title="채팅방 이름 수정"
        placeholder="새 이름을 입력하세요"
        value={renameText}
        setValue={setRenameText}
        onCancel={() => {
          if (renameMut.isPending) return;
          setRenameOpen(false);
          setRenameId(null);
        }}
        onConfirm={confirmRename}
        confirmText={renameMut.isPending ? "저장 중…" : "저장"}
        disabled={renameMut.isPending}
      />
    </S.Container>
  );
}
