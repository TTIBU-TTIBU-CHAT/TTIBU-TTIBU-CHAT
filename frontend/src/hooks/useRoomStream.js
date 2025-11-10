// useRoomStream.js
import { useEffect, useRef, useState } from "react";
import { chatRoomService } from "@/services/chatRoomService";

/**
 * handlers: {
 *   onRoomCreated, onChatStream, onChatDone,
 *   onRoomShortSummary, onChatSummaryKeywords, onChatError,
 *   onMessage, onOpen, onError
 * }
 */
export function useRoomStream(roomId, handlers = {}) {
  const {
    onRoomCreated,
    onChatStream,
    onChatDone,
    onRoomShortSummary,
    onChatSummaryKeywords,
    onChatError,
    onMessage,
    onOpen,
    onError,
  } = handlers;

  const esRef = useRef(null);
  const currentRoomIdRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);

  const connect = (targetRoomId) => {
    const rid = targetRoomId ?? roomId;
    if (!rid) return;
    // 같은 룸으로 이미 열려있으면 스킵
    if (esRef.current && currentRoomIdRef.current === rid) return;
    // 다른 룸으로 전환 시 기존 연결 정리
    if (esRef.current) {
      try {
        esRef.current.close();
      } catch {}
      esRef.current = null;
      setConnected(false);
    }
    const es = chatRoomService.openStream(rid);
    esRef.current = es;
    currentRoomIdRef.current = rid;

    es.addEventListener("ROOM_CREATED", (evt) => {
      try {
        const data = JSON.parse(evt.data);
        console.log("[SSE ROOM_CREATED]", data);
        setLastMessage({ type: "ROOM_CREATED", ...data });
        onRoomCreated?.(data);
      } catch {
        /* noop */
      }
    });

    es.addEventListener("CHAT_STREAM", (evt) => {
      try {
        const data = JSON.parse(evt.data);
        setLastMessage({ type: "CHAT_STREAM", ...data });
        onChatStream?.(data);
      } catch {
        /* noop */
      }
    });

    es.addEventListener("CHAT_DONE", (evt) => {
      try {
        const data = JSON.parse(evt.data);
        setLastMessage({ type: "CHAT_DONE", ...data });
        onChatDone?.(data);
      } catch {
        /* noop */
      }
    });

    es.addEventListener("ROOM_SHORT_SUMMARY", (evt) => {
      try {
        const data = JSON.parse(evt.data);
        console.log("[SSE ROOM_SHORT_SUMMARY]", data);
        setLastMessage({ type: "ROOM_SHORT_SUMMARY", ...data });
        onRoomShortSummary?.(data);
      } catch {
        /* noop */
      }
    });

    es.addEventListener("CHAT_SUMMARY_KEYWORDS", (evt) => {
      try {
        const data = JSON.parse(evt.data);
        console.log("[SSE CHAT_SUMMARY_KEYWORDS]", data);
        setLastMessage({ type: "CHAT_SUMMARY_KEYWORDS", ...data });
        onChatSummaryKeywords?.(data);
      } catch {
        /* noop */
      }
    });

    es.addEventListener("CHAT_ERROR", (evt) => {
      try {
        const data = JSON.parse(evt.data);
        console.error("[SSE CHAT_ERROR]", data);  
        setLastMessage({ type: "CHAT_ERROR", ...data });
        onChatError?.(data);
      } catch {
        /* noop */
      }
    });

    // fallback: 서버가 event: 를 안 보낼 때
    es.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        setLastMessage(msg);
        onMessage?.(msg);
      } catch {
        setLastMessage(evt.data);
        onMessage?.(evt.data);
      }
    };

    es.onopen = (evt) => {
      setConnected(true);
      onOpen?.(evt);
    };

    es.onerror = (e) => {
      onError?.(e);
      console.error("[SSE ERROR]", e);
    };
  };

  const disconnect = async () => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
      setConnected(false);
      console.log("SSE disconnected");
      try {
        await chatRoomService.closeStream(roomId);
      } catch {}
    }
  };

  // roomId가 생기면 자동 연결, 바뀌면 기존 연결 정리 후 재연결
  useEffect(() => {
    if (!roomId) return;
    connect(roomId);
    return () => {
      // cleanup은 '이 roomId용 effect'가 교체될 때만 호출됨 (다른 roomId로 갈 때)
      // 여기서 disconnect() 하면 직후 connect가 다시 열림
      disconnect();
    };
  }, [roomId]);

  return { connect, disconnect, connected, lastMessage };
}
