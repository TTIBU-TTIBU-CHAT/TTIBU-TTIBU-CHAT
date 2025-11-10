import * as S from "./SidebarMenu.styles";
import { useSidebarStore } from "@/store/useSidebarStore";
import NewChatIcon from "@/components/icons/NewChatIcon";
import GroupIcon from "@/components/icons/GroupIcon";
import ChatRoomIcon from "@/components/icons/ChatRoomIcon";
import { useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useGroups } from "@/hooks/useGroups";
import { useRooms } from "@/hooks/useChatRooms";
export default function SidebarMenu() {
  const { isCollapsed } = useSidebarStore();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  // const [groups, setGroups] = useState([]);
  // const [chats, setChats] = useState([]);
  const {
    data: groupsData,
    isLoading: groupsLoading,
    isError: groupsError,
  } = useGroups();

  const {
    data: roomsData,
    isLoading: roomsLoading,
    isError: roomsError,
  } = useRooms();

  const groups = Array.isArray(groupsData)
    ? groupsData
    : groupsData?.items || groupsData?.groups || [];

  const chatsRaw = Array.isArray(roomsData)
    ? roomsData
    : roomsData?.items || roomsData?.rooms || [];

  const chats = (chatsRaw || [])
    .map((r) => ({
      id: r.id ?? r._id ?? r.room_id,
      name: r.name,
      lastMessage: r.latest_question,
      updatedAt: r.updated_at,
    }))
    .filter((x) => x && x.id);

  // useEffect(() => {
  //   const mockGroups = [
  //     { id: 1, name: "자율 프로젝트 관련 그룹" },
  //     { id: 2, name: "저녁 메뉴 추천 그룹" },
  //     { id: 3, name: "기가막힌 아이디어 모아놓은 그룹" },
  //   ];

  //   const mockChats = [
  //     { id: 1, name: "자율 프로젝트" },
  //     { id: 2, name: "생각 정리하는 채팅방" },
  //     { id: 3, name: "React Flow 실험방" },
  //     { id: 4, name: "기획 리뷰" },
  //     { id: 5, name: "배포 체크" },
  //     { id: 6, name: "이것저것" },
  //   ];

  //   setGroups(mockGroups);
  //   setChats(mockChats);
  // }, []);

  const handleNavigate = (path) => navigate({ to: path });

  // ✅ 채팅 클릭 시 /chatRooms/:id 로 이동하는 함수
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

      {/* 그룹 */}
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
              <S.SubList>
                {groups.slice(0, 5).map((group) => {
                  const gid = group.id ?? group._id;
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

      {/* 채팅 */}
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

      {/* ✅ 채팅 리스트 - 클릭 시 /chatRooms/:id 로 이동 */}
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
                // 경로 오탈자 주의: "/chatRooms"로 통일
                <S.MoreButton onClick={() => handleNavigate("/chatrooms")}>
                  더보기 ({chats.length - 5}+)
                </S.MoreButton>
              )}
            </>
          )}
          {chats.length > 5 && (
            <S.MoreButton onClick={() => handleNavigate("/chatrooms")}>
              더보기 ({chats.length - 5}+)
            </S.MoreButton>
          )}
        </>
      )}
    </>
  );
}
