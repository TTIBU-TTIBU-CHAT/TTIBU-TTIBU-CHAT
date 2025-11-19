// src/routes/chatrooms/-chatFlow.graph.js
import { LS_BRANCH_BY_NODE, loadJSON, saveJSON } from "./-chatFlow.storage";

/* ======================================================================= */
/* 🔥 parent 체인 따라 올라가면서 최대 limit 개수만큼 조상 chat_id 수집 */
/* ======================================================================= */
export function collectAncestorChatIds(nodes, startChatId, limit = 5) {
  if (!startChatId) return [];

  const parentMap = {};
  for (const n of nodes) {
    if (n.chat_id && n.parent_chat_id) {
      parentMap[n.chat_id] = n.parent_chat_id;
    }
  }

  const result = [];
  let cur = startChatId;

  while (result.length < limit) {
    const parent = parentMap[cur];
    if (!parent) break; // 부모 없으면 종료
    result.push(parent);
    cur = parent;
  }

  return result;
}

/* ======================================================================= */
/* 🔥 그래프를 DFS 순회해서 정렬된 nodes 리턴                               */
/* ======================================================================= */
export function orderedNodesByGraph(graph) {
  if (!graph) return [];
  const nodes = graph.nodes ?? [];
  const edges = graph.edges ?? [];

  // chat_id / id / node_id → 문자열 id로 통일
  const idToNode = new Map();
  nodes.forEach((n) => {
    const raw = n.chat_id ?? n.id ?? n.node_id;
    if (raw === undefined || raw === null) return;
    const id = String(raw);
    idToNode.set(id, n);
  });

  const childrenMap = new Map(); // parentId -> [childId...]
  const incomingCount = new Map(); // nodeId -> in-degree

  edges.forEach((e) => {
    const s = String(e.source);
    const t = String(e.target);
    if (!idToNode.has(s) || !idToNode.has(t)) return;

    const arr = childrenMap.get(s) ?? [];
    arr.push(t);
    childrenMap.set(s, arr);

    incomingCount.set(t, (incomingCount.get(t) || 0) + 1);
    if (!incomingCount.has(s)) {
      incomingCount.set(s, incomingCount.get(s) || 0);
    }
  });

  // 루트들 = 들어오는 엣지가 없는 노드
  const roots = [];
  idToNode.forEach((_, id) => {
    const inDeg = incomingCount.get(id) ?? 0;
    if (inDeg === 0) roots.push(id);
  });

  roots.sort(); // 루트가 여러개면 id 기준 정렬

  const visited = new Set();
  const result = [];

  const dfs = (id) => {
    if (visited.has(id)) return;
    visited.add(id);
    const node = idToNode.get(id);
    if (node) result.push(node);

    const children = (childrenMap.get(id) || []).slice().sort();
    children.forEach(dfs);
  };

  roots.forEach(dfs);

  // 엣지에 안 연결된 독립 노드들
  idToNode.forEach((node, id) => {
    if (!visited.has(id)) {
      result.push(node);
    }
  });

  return result;
}

/* ======================================================================= */
/* 🧠 parent / children 필드 채우는 헬퍼                                   */
/* ======================================================================= */
export function attachParentChildren(graph) {
  if (!graph) return graph;

  const nodes = graph.nodes ?? [];
  const edges = graph.edges ?? [];

  const parentMap = new Map(); // childChatId -> parentChatId
  const childrenMap = new Map(); // parentChatId -> [childChatId]

  edges.forEach((e) => {
    if (!e) return;
    const s = Number(e.source);
    const t = Number(e.target);
    if (Number.isNaN(s) || Number.isNaN(t)) return;

    parentMap.set(t, s);

    const arr = childrenMap.get(s) ?? [];
    arr.push(t);
    childrenMap.set(s, arr);
  });

  const nextNodes = nodes.map((n) => {
    const cidRaw = n?.chat_id ?? n?.id ?? n?.node_id;
    const cid = cidRaw !== undefined && cidRaw !== null ? Number(cidRaw) : null;

    if (cid === null || Number.isNaN(cid)) {
      return {
        ...n,
        parent: null,
        children: [],
      };
    }

    return {
      ...n,
      parent: parentMap.get(cid) ?? null,
      children: childrenMap.get(cid) ?? [],
    };
  });

  return {
    ...graph,
    nodes: nextNodes,
  };
}

/* ======================================================================= */
/* 🧠 branchViews를 nodes/edges 기준으로 재구성하는 헬퍼                    */
/* ======================================================================= */
export function rebuildBranchViewsFromNodes(
  nodes,
  edges,
  roomId,
  prevBranchViews
) {
  const prevBranches = prevBranchViews?.branches ?? {};
  const branches = {};
  let maxBranchNumber = prevBranchViews?.max_branch_number ?? 0;

  const nodeById = new Map(
    (nodes ?? []).map((n) => [Number(n.chat_id ?? n.id ?? n.node_id), n])
  );

  // 노드 기준으로 included_nodes 구성
  (nodes ?? []).forEach((n) => {
    const cidRaw = n?.chat_id ?? n?.id ?? n?.node_id;
    const cid = cidRaw !== undefined && cidRaw !== null ? Number(cidRaw) : null;
    const bIdRaw = n?.branch_id ?? n?.branchId ?? null;
    const bId = bIdRaw !== undefined && bIdRaw !== null ? Number(bIdRaw) : null;

    if (cid === null || Number.isNaN(cid)) return;
    if (bId === null || Number.isNaN(bId)) return;

    const key = String(bId);
    if (!branches[key]) {
      const prev = prevBranches[key];
      branches[key] = {
        branch_name: prev?.branch_name ?? "",
        included_nodes: [],
        included_edges: [],
      };
    }
    branches[key].included_nodes.push(cid);
    maxBranchNumber = Math.max(maxBranchNumber, bId);
  });

  // 엣지 기준으로 included_edges 구성 (source/target이 같은 branch에 속하는 경우)
  (edges ?? []).forEach((e) => {
    const s = Number(e.source);
    const t = Number(e.target);
    if (Number.isNaN(s) || Number.isNaN(t)) return;

    const sn = nodeById.get(s);
    const tn = nodeById.get(t);
    if (!sn || !tn) return;

    const sb = sn?.branch_id ?? sn?.branchId ?? null;
    const tb = tn?.branch_id ?? tn?.branchId ?? null;
    const sbNum = sb !== undefined && sb !== null ? Number(sb) : null;
    const tbNum = tb !== undefined && tb !== null ? Number(tb) : null;

    if (
      sbNum === null ||
      tbNum === null ||
      Number.isNaN(sbNum) ||
      Number.isNaN(tbNum) ||
      sbNum !== tbNum
    ) {
      return;
    }

    const key = String(sbNum);
    if (!branches[key]) {
      const prev = prevBranches[key];
      branches[key] = {
        branch_name: prev?.branch_name ?? "",
        included_nodes: [],
        included_edges: [],
      };
    }

    branches[key].included_edges.push({
      source: s,
      target: t,
    });
  });

  return {
    chat_room_id: Number(roomId),
    max_branch_number: maxBranchNumber,
    branches,
    last_updated: new Date().toISOString(),
  };
}

/* ======================================================================= */
/* 🧠 ReactFlow snapshot 기준으로 chatViews / branchViews "부분" 재구성    */
/*      - 기존 도메인 그래프(prevChatViews)는 유지                         */
/*      - snapshot에 있는 노드들에 대해서만 position 을 갱신                */
/*      - ignoreRfIds 는 "도메인에 아직 없는 임시 노드"로 취급            */
/* ======================================================================= */
export function rebuildFromSnapshot(
  prevChatViews,
  prevBranchViews,
  snapshot,
  roomId,
  options = {}
) {
  const ignoreSet = new Set(
    (options.ignoreRfIds ?? []).map((id) => String(id))
  );

  const prevNodes = prevChatViews?.nodes ?? [];

  const snapNodesRaw = Array.isArray(snapshot?.nodes) ? snapshot.nodes : [];

  // ✅ 1) ignore 대상이 아닌 RF 노드만 사용해서 position 맵 구성
  const snapNodes = snapNodesRaw.filter((n) => !ignoreSet.has(String(n.id)));

  const posMap = new Map();
  snapNodes.forEach((n) => {
    // ReactFlow id 는 도메인 chat_id 와 동일하다고 가정
    const cid = Number(n.id);
    if (Number.isNaN(cid)) return;

    const x = n.position?.x ?? n.x ?? 0;
    const y = n.position?.y ?? n.y ?? 0;
    posMap.set(cid, { x, y });
  });

  // ✅ 2) 기존 도메인 노드들을 베이스로 두고,
  //       snapshot 에 있는 노드만 유지하면서 position 갱신
  //       🔥 snapshot에 없는 노드는 삭제된 것으로 간주하여 제외
  const rebuiltNodes = prevNodes
    .filter((n) => {
      const cidRaw = n.chat_id ?? n.id ?? n.node_id;
      const cid = cidRaw != null ? Number(cidRaw) : NaN;
      if (Number.isNaN(cid)) {
        return false; // 유효하지 않은 노드 제거
      }
      // 🔥 snapshot에 있는 노드만 유지 (없으면 삭제된 것으로 간주)
      return posMap.has(cid);
    })
    .map((n) => {
      const cidRaw = n.chat_id ?? n.id ?? n.node_id;
      const cid = Number(cidRaw);
      const pos = posMap.get(cid);

      return {
        ...n,
        position: {
          ...(n.position ?? {}),
          ...pos,
        },
      };
    });

  // ✅ 3) snapshot의 엣지를 기준으로 재구성
  //       🔥 노드 삭제 시 ReactFlow에서 재연결된 엣지를 반영하기 위해
  //       snapshot의 엣지를 우선 사용하되, 유효한 노드만 연결
  const snapEdges = Array.isArray(snapshot?.edges) ? snapshot.edges : [];

  // snapshot 엣지 중 ignore 대상이 아니고, 양쪽 노드가 모두 존재하는 것만 사용
  const rebuiltEdges = snapEdges
    .filter((e) => {
      const sourceStr = String(e.source);
      const targetStr = String(e.target);

      // ignore 대상 제외
      if (ignoreSet.has(sourceStr) || ignoreSet.has(targetStr)) {
        return false;
      }

      const sourceId = Number(e.source);
      const targetId = Number(e.target);

      // 양쪽 노드가 모두 snapshot에 있는 엣지만 유지
      return posMap.has(sourceId) && posMap.has(targetId);
    })
    .map((e) => ({
      source: Number(e.source),
      target: Number(e.target),
      // 기타 엣지 속성 유지
      ...(e.id && { id: e.id }),
      ...(e.type && { type: e.type }),
      ...(e.data && { data: e.data }),
    }));

  // ✅ 4) parent / children 부착
  const chatInfo = attachParentChildren({
    chat_room_id: Number(roomId),
    ...(prevChatViews ?? {}),
    nodes: rebuiltNodes,
    edges: rebuiltEdges,
    last_updated: new Date().toISOString(),
  });

  // ✅ 5) branchViews 재구성 (branch_name 은 prevBranchViews 를 최대한 유지)
  const branchView = rebuildBranchViewsFromNodes(
    chatInfo.nodes ?? [],
    chatInfo.edges ?? [],
    roomId,
    prevBranchViews
  );

  return { chatInfo, branchView };
}

/* ======================================================================= */
/* 🔥 모달에서 입력한 브랜치명(nodeId 기준)을 branch_id 기준으로 반영       */
/* ======================================================================= */
export function applyLocalBranchNames(
  nextChatViews,
  nextBranchViews,
  flowIdToChatId
) {
  if (!nextChatViews || !nextBranchViews) return nextBranchViews;

  const nodeNameMap = loadJSON(LS_BRANCH_BY_NODE, {}); // { nodeId(string) : branchName }
  const entries = Object.entries(nodeNameMap || {});
  if (entries.length === 0) return nextBranchViews;

  const nodes = nextChatViews.nodes ?? [];
  const mergedBranches = { ...(nextBranchViews.branches ?? {}) };

  for (const [rfId, nameRaw] of entries) {
    const name = (nameRaw || "").trim();
    if (!name) continue;

    // 1) ReactFlow node id → 도메인 chat_id 찾기
    const chatIdFromMap =
      typeof flowIdToChatId?.get === "function"
        ? flowIdToChatId.get(String(rfId))
        : flowIdToChatId?.[String(rfId)];

    const numericRfId = Number(rfId);
    const chatId =
      chatIdFromMap ?? (!Number.isNaN(numericRfId) ? numericRfId : null);

    if (!chatId) continue;

    // 2) 해당 chat_id를 가진 도메인 노드 찾기
    const node = nodes.find(
      (n) => Number(n.chat_id ?? n.id ?? n.node_id) === Number(chatId)
    );
    if (!node) continue;

    // 3) 이 노드의 branch_id 가져오기
    const bRaw = node.branch_id ?? node.branchId ?? null;
    const bNum = bRaw != null ? Number(bRaw) : null;
    if (!bNum || Number.isNaN(bNum)) continue;

    const key = String(bNum);
    const prev = mergedBranches[key] || {
      branch_name: "",
      included_nodes: [],
      included_edges: [],
    };

    // 4) 🔥 branch_name 덮어쓰기
    mergedBranches[key] = {
      ...prev,
      branch_name: name,
    };
  }

  // 필요하면 여기서 localStorage 비워줄 수도 있음
  // saveJSON(LS_BRANCH_BY_NODE, {});

  return {
    ...nextBranchViews,
    branches: mergedBranches,
  };
}
