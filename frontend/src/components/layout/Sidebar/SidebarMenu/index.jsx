import * as S from "./SidebarMenu.styles";
import { useSidebarStore } from "@/store/useSidebarStore";
import NewChatIcon from "@/components/icons/NewChatIcon";
import GroupIcon from "@/components/icons/GroupIcon";
import ChatRoomIcon from "@/components/icons/ChatRoomIcon";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useGroups } from "@/hooks/useGroups";
import { useRooms } from "@/hooks/useChatRooms";

export default function SidebarMenu() {
  const { isCollapsed } = useSidebarStore();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const {
    data: groupsData,
    isLoading: groupsLoading,
    isError: groupsError,
  } = useGroups();

  const {
    data: rooms = [], // ✅ 항상 배열로 받기
    isLoading: roomsLoading,
    isError: roomsError,
  } = useRooms();

  const groups = Array.isArray(groupsData)
    ? groupsData
    : groupsData?.items || groupsData?.groups || [];

  // const chatsRaw = Array.isArray(roomsData.data)
  //   ? roomsData.data
  //   : roomsData?.items || roomsData?.rooms || [];
  // console.log("Raw sidebar chats data:", chatsRaw);
  const chats = rooms
    .map((r) => ({
      id: r.roomUid ?? r._id ?? r.room_id ?? r.id,
      name: r.name ?? r.title ?? "이름 없는 채팅",
      lastMessage: r.summary ?? r.lastMessage ?? "",
      updatedAt: r.updatedAt ?? r.updated_at ?? r.modifiedAt,
    }))
    .filter((x) => x && x.id);

  // console.log("Sidebar chats:", chats);
  const handleNavigate = (path) => navigate({ to: path });

  const handleChatClick = (chatId) => {
    navigate({
      to: "/chatrooms/$nodeId",
      params: { nodeId: String(chatId) },
    });
  };
  const handleGroupClick = (groupId) => {
    navigate({
      to: "/groups/$nodeId",
      params: { nodeId: String(groupId) },
    });
  };
  return (
    <>
      {/* 새 채팅 */}
      <S.MenuItem
        $collapsed={isCollapsed}
        $active={currentPath === "/"}
        onClick={() => handleNavigate("/")}
      >
        <div className="icon">
          <NewChatIcon />
        </div>
        <span>새 채팅</span>
      </S.MenuItem>

      {/* 그룹 메뉴 */}

      <S.MenuItem
        $collapsed={isCollapsed}
        $active={currentPath.startsWith("/groups")}
        onClick={() => handleNavigate("/groups")}
      >
        <div className="icon">
          <GroupIcon />
        </div>
        <span>그룹</span>
      </S.MenuItem>

      {/* 그룹 리스트 */}
      {!isCollapsed && (
        <>
          {groupsLoading && (
            <S.SubList>
              <S.SubItem>그룹 불러오는 중…</S.SubItem>
            </S.SubList>
          )}
          {groupsError && (
            <S.SubList>
              <S.SubItem>그룹 로드 실패</S.SubItem>
            </S.SubList>
          )}
          {!groupsLoading && !groupsError && (
            <>
              {groups.length === 0 ? (
                <S.SubList>
                  <S.SubItem style={{ opacity: 0.65 }}>
                    등록된 그룹이 없어요
                  </S.SubItem>
                </S.SubList>
              ) : (
                <>
                  <S.SubList>
                    {groups.slice(0, 5).map((group) => {
                      const gid = group.groupId ?? group.group_id;
                      return (
                        <S.SubItem
                          key={gid}
                          onClick={() => handleGroupClick(gid)}
                          $active={currentPath === `/groups/${gid}`}
                        >
                          {group.name}
                        </S.SubItem>
                      );
                    })}
                  </S.SubList>
                  {groups.length > 5 && (
                    <S.MoreButton onClick={() => handleNavigate("/groups")}>
                      더보기 ({groups.length - 5}+)
                    </S.MoreButton>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}

      {/* 채팅 메뉴 */}
      <S.MenuItem
        $collapsed={isCollapsed}
        $active={currentPath.startsWith("/chatrooms")}
        onClick={() => handleNavigate("/chatrooms")}
      >
        <div className="icon">
          <ChatRoomIcon />
        </div>
        <span>채팅방</span>
      </S.MenuItem>

      {/* 채팅 리스트 */}
      {!isCollapsed && (
        <>
          {roomsLoading && (
            <S.SubList>
              <S.SubItem>채팅방 불러오는 중…</S.SubItem>
            </S.SubList>
          )}
          {roomsError && (
            <S.SubList>
              <S.SubItem>채팅방 로드 실패</S.SubItem>
            </S.SubList>
          )}
          {!roomsLoading && !roomsError && (
            <>
              {chats.length === 0 ? (
                <S.SubList>
                  <S.SubItem style={{ opacity: 0.65 }}>
                    대화가 아직 없어요
                  </S.SubItem>
                </S.SubList>
              ) : (
                <>
                  <S.SubList>
                    {chats.slice(0, 5).map((chat) => (
                      <S.SubItem
                        key={chat.id}
                        onClick={() => handleChatClick(chat.id)}
                        $active={currentPath === `/chatrooms/${chat.id}`}
                      >
                        {chat.name}
                      </S.SubItem>
                    ))}
                  </S.SubList>
                  {chats.length > 5 && (
                    <S.MoreButton onClick={() => handleNavigate("/chatrooms")}>
                      더보기 ({chats.length - 5}+)
                    </S.MoreButton>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
