import { api } from '@services/api';

export const groupService = {
  create: (payload) => api.post('/groups', payload), // 그룹 생성
  update: ({ groupId, ...patch }) => api.patch(`/groups/${groupId}`, patch), // 그룹 수정
  rename: ({ groupId, name }) => api.patch(`/groups/${groupId}/name`, { name }), // 그룹 이름 수정
  remove: (groupId) => api.delete(`/groups/${groupId}`), // 그룹 삭제
  detail: (groupId) => api.get(`/groups/${groupId}`), // 그룹 상세 조회
  list: (params) => api.get('/groups', { params }), // 그룹 리스트 조회
  getView: () => api.get('/groups/view'), // 그룹 JSON 조회
  saveView: (json) => api.patch('/groups/view', json), // 그룹 JSON 저장
};
