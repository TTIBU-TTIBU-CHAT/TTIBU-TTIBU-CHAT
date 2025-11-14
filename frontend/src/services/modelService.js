import { api } from "@services/api";

export const modelService = {
  getMeWithModels: () => api.get("/members/me"),

  selectModels: (modelCatalogUids = []) => {
    const body = modelCatalogUids.map((id) => ({ modelCatalogUid: id }));
    return api.post("/models", body);
  },
  getAvailableModels: () => api.get('/models'),
  setDefaultModel: (modelCatalogUid) => api.patch(`/models/${modelCatalogUid}`),
};
