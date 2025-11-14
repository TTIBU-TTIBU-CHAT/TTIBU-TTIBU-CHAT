import { create } from "zustand";
import { modelService } from "@services/modelService";

export const useModelStore = create((set) => ({
  providers: [],
  selectedIds: [],
  defaultId: null,
  tokens: null,
  loading: false,
  error: null,

  fetchModelsFromMe: async () => {
    set({ loading: true, error: null });
    try {
      const res = await modelService.getMeWithModels();

      if (res.data.status === "success") {
        const data = res.data.data ?? {};
        const providers = data.models ?? [];
        const tokens = data.tokens ?? null;

        const selectedIds = [];
        let defaultId = null;
        providers.forEach((p) =>
          p.modelList?.forEach((m) => {
            if (m.isSelected) selectedIds.push(m.modelCatalogUid);
            if (m.isDefault) defaultId = m.modelCatalogUid;
          })
        );

        set({
          providers,
          selectedIds,
          defaultId,
          tokens,
          loading: false,
        });
      } else {
        set({
          error: res.data.message || "모델 목록 조회 실패",
          loading: false,
        });
      }
      return res;
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },
  fetchAvailableModels: async () => {
    try {
      set({ loading: true, error: null });
      const res = await modelService.getAvailableModels();
      console.log("Fetched available models:", res.data);
      // 백엔드 예시 응답: { status: 'success', data: [ { modelUid, modelName, modelCode, isDefault } ] }
      const list = res?.data?.data ?? [];
      const providers = [{ providerName: "default", models: list }];
      set({ providers, loading: false });
    } catch (e) {
      set({ error: e, loading: false });
    }
  },
}));
