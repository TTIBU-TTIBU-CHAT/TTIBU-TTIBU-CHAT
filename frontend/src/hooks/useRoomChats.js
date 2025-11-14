import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { chatService } from "@/services/chatService";

// 쿼리키 헬퍼
const rk = {
  roomDetail: (roomId) => ["rooms", "detail", roomId],
  roomChats: (roomId) => ["rooms", "chats", roomId],
  // ✅ 배열/페이지를 객체로 묶어 캐시 키 안정화
  search: (keywords = [], page = 0, size = 20) => [
    "chats",
    "search",
    { keywords: [...keywords], page, size },
  ],
};

/** ✅ 그룹 붙이기: POST /rooms/{roomId}/attach-group
 *  vars: { roomId, group_id }
 */
export function useAttachGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) => {
      console.log("Attaching group with vars:", vars);
      console.log("useAttachGroup", chatService.attachGroup(vars))
      return chatService.attachGroup(vars);
    },
    onSuccess: (_res, vars) => {
      const roomId = vars?.roomId;
      if (roomId) {
        qc.invalidateQueries({ queryKey: rk.roomDetail(roomId) });
        qc.invalidateQueries({ queryKey: rk.roomChats(roomId) });
      }
    },
  });
}

/** ✅ 기존 채팅 복사해서 붙이기: POST /chats/copies
 *  vars: { originUid, roomUid }
 */
export function useAttachChatFromExisting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) => chatService.attachChatFromExisting(vars),
    onSuccess: (res, vars) => {
      // roomUid는 vars나 response 둘 중 하나에서 가져오기
      const apiRoomUid =
        res?.data?.data?.roomUid ?? res?.data?.roomUid ?? undefined;
      const roomId = vars?.roomUid ?? apiRoomUid;

      if (roomId != null) {
        qc.invalidateQueries({ queryKey: rk.roomDetail(roomId) });
        qc.invalidateQueries({ queryKey: rk.roomChats(roomId) });
      }
    },
  });
}

/** ✅ 새 채팅 생성: POST /rooms/{roomId}/chats
 *  vars: { roomId, question, parents, branch_id, branch_name?, model, useLlm }
 */
export function useCreateChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) => chatService.createChat(vars),
    onSuccess: (res, vars) => {
      const roomId =
        vars?.roomId ??
        res?.data?.room_id ??
        res?.data?.data?.room_id ??
        undefined;

      if (roomId != null) {
        qc.invalidateQueries({ queryKey: rk.roomChats(roomId) });
        qc.invalidateQueries({ queryKey: rk.roomDetail(roomId) });
      }
    },
  });
}

/** ✅ 채팅 검색: GET /api/v1/chats?k=&k=&page=&size= */
export function useSearchChats(keywords = [], page = 0, size = 20) {
  const enabled = Array.isArray(keywords) && keywords.length > 0;
  console.log("useSearchChats called with:", { keywords, page, size, enabled });
  return useQuery({
    queryKey: rk.search(keywords, page, size),
    queryFn: async () => {
      const json = await chatService.searchChats({ keywords, page, size });
      // 서버 래핑: { status, data }
      console.log("Search response:", json);
      if (json?.status === "success") return json.data; // Page<SearchedResultInfo>
      const reason =
        json?.data?.reason || json?.message || "검색 요청에 실패했습니다.";
      throw new Error(reason);
    },
    enabled,
    staleTime: 30_000,
  });
}
