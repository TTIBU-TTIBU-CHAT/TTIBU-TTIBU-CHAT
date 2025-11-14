// src/routes/chatrooms/-chatFlow.utils.js

/* ====== ChatStream 병합 유틸 ====== */
export function pickId(n) {
  return String(n?.chat_id ?? n?.id);
}

export function ensurePositions(prevNodes, incomingNodes) {
  const MAX_X =
    prevNodes.length > 0
      ? Math.max(...prevNodes.map((n) => n?.position?.x ?? 100))
      : 100;

  const START_Y = 100;
  const GAP_X = 400;

  let offsetIndex = 1;
  return (incomingNodes ?? []).map((n) => {
    if (
      n?.position &&
      Number.isFinite(n.position.x) &&
      Number.isFinite(n.position.y)
    ) {
      return n;
    }
    return {
      ...n,
      position: { x: MAX_X + GAP_X * offsetIndex++, y: START_Y },
    };
  });
}

export function mergeNodes(prevNodes, incomingNodesWithPos) {
  const byId = new Map((prevNodes ?? []).map((n) => [pickId(n), n]));
  for (const raw of incomingNodesWithPos ?? []) {
    const id = pickId(raw);
    const prev = byId.get(id);
    if (!prev) {
      byId.set(id, raw);
    } else {
      const keepPos = prev.position;
      byId.set(id, { ...prev, ...raw, position: keepPos ?? raw.position });
    }
  }
  return Array.from(byId.values());
}

export function uniqEdges(edges) {
  const seen = new Set();
  const out = [];
  for (const e of edges ?? []) {
    const key = `${e.source}→${e.target}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(e);
    }
  }
  return out;
}

/* 작은 유틸: 노드 변경 헬퍼 (변경된 key만 수집해 로그용으로 반환) */
export function updateNodeByChatId(prevChatViews, chatId, updater) {
  if (!prevChatViews) return { next: prevChatViews, changed: null };
  const nextNodes = prevChatViews.nodes.map((n) => {
    const nid = n?.chat_id ?? n?.id;
    if (String(nid) === String(chatId)) {
      const next = updater(n);
      return next;
    }
    return n;
  });

  const prevNode = prevChatViews.nodes.find(
    (n) => String(n?.chat_id ?? n?.id) === String(chatId)
  );
  const nextNode = nextNodes.find(
    (n) => String(n?.chat_id ?? n?.id) === String(chatId)
  );

  let changed = null;
  if (prevNode && nextNode) {
    changed = {};
    for (const k of Object.keys(nextNode)) {
      if (prevNode[k] !== nextNode[k]) {
        changed[k] = { before: prevNode[k], after: nextNode[k] };
      }
    }
  }
  return { next: { ...prevChatViews, nodes: nextNodes }, changed };
}

/* -------------------------- RF 포맷 변환기 -------------------------- */
export function toRF(chatViews) {
  const nodes = (chatViews?.nodes ?? []).map((n, i) => {
    const id = String(n?.chat_id ?? n?.id ?? i);
    const pos = n?.position ?? { x: 100 + 400 * i, y: 100 };
    const branch_id = n?.branch_id ?? null;
    console.log("branch_id 확인용:", branch_id);
    return {
      id,
      position: {
        x: Number.isFinite(pos?.x) ? pos.x : 100 + 400 * i,
        y: Number.isFinite(pos?.y) ? pos.y : 100,
      },
      type: "qa",
      data: {
        label: n?.label ?? n?.question ?? n?.summary ?? id,
        question: n?.question ?? "",
        answer: n?.answer ?? "",
        summary: n?.summary ?? "",
        keywords: n?.keywords ?? [],
        short_summary: n?.short_summary ?? "",
        branch: n?.branch,
        branch_id,
        raw: n,
      },
    };
  });

  const edges = (chatViews?.edges ?? []).map((e, i) => {
    const s = String(e?.source);
    const t = String(e?.target);
    return {
      id: e?.id ?? `${s}-${t}-${i}`,
      source: s,
      target: t,
      type: "deletable",
    };
  });

  return { nodes, edges };
}

/* -------------------------- 채팅 메시지 변환기 -------------------------- */
export function toChatMessages(chatViews) {
  if (!chatViews?.nodes?.length) return [];

  const nodes = [...chatViews.nodes].sort((a, b) => {
    const ta = a?.created_at ? +new Date(a.created_at) : 0;
    const tb = b?.created_at ? +new Date(b.created_at) : 0;
    return ta - tb;
  });

  const out = [];
  for (const n of nodes) {
    const chatId = String(n?.chat_id ?? n?.id ?? "");
    const q = n?.question;
    const a = n?.answer;
    const qTs = n?.created_at ? +new Date(n.created_at) : undefined;
    const aTs = n?.answered_at ? +new Date(n.answered_at) : undefined;
    const model = n?.model ?? n?.sourceModel ?? undefined;

    if (q) {
      out.push({
        id: `u-${chatId}`,
        role: "user",
        content: q,
        ts: qTs ?? Date.now(),
      });
    }
    if (a) {
      out.push({
        id: `a-${chatId}`,
        role: "assistant",
        content: a,
        ts: aTs ?? qTs ?? Date.now(),
        ...(model ? { model } : {}),
      });
    }
  }

  out.sort((x, y) => (x.ts ?? 0) - (y.ts ?? 0));
  return out;
}

/* ------------------------- room 데이터 → 뷰 구조 ------------------------- */
export function deriveViews(src) {
  let chatViews = {
    chat_room_id: 0,
    nodes: [],
    edges: [],
    last_updated: "",
  };
  let branchViews = {
    chat_room_id: 0,
    max_branch_number: 0,
    branches: {},
    last_updated: "",
  };

  if (!src) {
    console.log("[deriveViews] src 없음 → 기본값 유지");
    return { chatViews, branchViews };
  }

  const chatInfo = src?.data?.chatInfo ?? src?.chatInfo ?? null;
  const branchView = src?.data?.branchView ?? src?.branchView ?? null;

  // 📌 (A) 최신 chatInfo/branchView 포맷
  if (chatInfo) {
    const room_id = chatInfo.chat_room_id ?? 0;
    const nodesArr = Array.isArray(chatInfo.nodes) ? chatInfo.nodes : [];
    const edgesArr = Array.isArray(chatInfo.edges) ? chatInfo.edges : [];
    const last_updated = chatInfo.last_updated ?? "";

    const START_X = 100;
    const START_Y = 100;
    const GAP_X = 320;

    const nodesWithPos = nodesArr.map((n, i) => {
      const hasPos =
        n?.position &&
        Number.isFinite(n.position.x) &&
        Number.isFinite(n.position.y);
      const pos = hasPos ? n.position : { x: START_X + GAP_X * i, y: START_Y };

      const branch_id = n?.branch_id ?? null;
      return { ...n, position: pos,branch_id, };
    });

    chatViews = {
      chat_room_id: Number(room_id) || 0,
      nodes: nodesWithPos,
      edges: edgesArr,
      last_updated,
    };

    if (branchView) {
      branchViews = {
        chat_room_id: Number(branchView.chat_room_id ?? room_id) || 0,
        max_branch_number: branchView.max_branch_number ?? 0,
        branches: branchView.branches ?? {},
        last_updated: branchView.last_updated ?? "",
      };
    } else {
      branchViews = {
        chat_room_id: Number(room_id) || 0,
        max_branch_number: 0,
        branches: {},
        last_updated: "",
      };
    }
    console.log(
      "[deriveViews] (A)/(B) chatInfo/branchView 기반 변환 완료",
      chatViews,
      branchViews
    );
    return { chatViews, branchViews };
  }

  // 📌 (B) 레거시 room 구조
  const room_id = src.room_id ?? src.roomId ?? 0;
  const branch_id_raw = src.branch_id ?? src.branchId ?? null;
  const branch_id_num = branch_id_raw != null ? Number(branch_id_raw) : null;
  const created_at = src.created_at ?? "";
  const nodesArrLegacy = Array.isArray(src.nodes) ? src.nodes : [];
  const edgesArrLegacy = Array.isArray(src.edges) ? src.edges : [];

  const nodesArrSorted = nodesArrLegacy.slice().sort((a, b) => {
    const ta = a?.created_at ? +new Date(a.created_at) : 0;
    const tb = b?.created_at ? +new Date(b.created_at) : 0;
    return ta - tb;
  });

  const START_X = 100;
  const START_Y = 100;
  const GAP_X = 320;

  const nodesWithPosLegacy = nodesArrSorted.map((n, i) => {
    const hasPos =
      n?.position &&
      Number.isFinite(n.position.x) &&
      Number.isFinite(n.position.y);
    const pos = hasPos ? n.position : { x: START_X + GAP_X * i, y: START_Y };

    let branch_id = n?.branch_id ?? null;
    if (branch_id == null && branch_id_num != null) {
      branch_id = branch_id_num;
    }
    return { ...n, position: pos, branch_id };
  });

  let included_nodes = [];
  let included_edges = [];

  if (branch_id_num != null) {
    included_nodes = nodesWithPosLegacy
      .map((n) => n?.chat_id ?? n?.id)
      .filter((v) => v != null);

    included_edges =
      included_nodes.length < 2
        ? []
        : included_nodes.slice(1).map((targetId, idx) => ({
            source: included_nodes[idx],
            target: targetId,
          }));
  }

  chatViews = {
    chat_room_id: Number(room_id) || 0,
    nodes: nodesWithPosLegacy,
    edges: edgesArrLegacy.length ? edgesArrLegacy : included_edges,
    last_updated: created_at,
  };

  const branchesObj = {};
  if (branch_id_num != null) {
    branchesObj[String(branch_id_num)] = {
      branch_name: "",
      included_nodes,
      included_edges,
    };
  }

  branchViews = {
    chat_room_id: Number(room_id) || 0,
    max_branch_number: branch_id_num || 0,
    branches: branchesObj,
    last_updated: created_at,
  };

  return { chatViews, branchViews };
}
