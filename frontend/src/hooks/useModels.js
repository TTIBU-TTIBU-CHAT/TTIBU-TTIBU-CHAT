// hooks/useModels.js
import { useEffect, useMemo } from "react";
import { useModelStore } from "@store/useModelStore";

export const useModels = ({ source = 'available' } = {}) => {
  const {
    providers = [],
    loading = false,
    error = null,
    fetchModelsFromMe,
    fetchAvailableModels,    // ✅ 추가
  } = useModelStore();

  // source에 따라 어떤 API를 부를지 선택
  useEffect(() => {
    if (source === 'me') {
      fetchModelsFromMe?.();
    } else {
      fetchAvailableModels?.(); // ✅ /models 호출
    }
  }, [source, fetchModelsFromMe, fetchAvailableModels]);

  const dropdownItems = useMemo(() => {
    return (providers || [])
      .flatMap((p) => p?.models || [])
      .map((m) => ({
        label: m?.modelName,
        value: m?.modelCode,
        uid: m?.modelUid,
        isDefault: !!m?.isDefault,
      }));
  }, [providers]);

  const defaultModelCode =
    (dropdownItems.find((m) => m.isDefault) || {}).value ||
    (dropdownItems[0] || {}).value ||
    "";

  return {
    dropdownItems,
    defaultModelCode,
    modelsLoading: loading,
    modelsError: error,
  };
};
