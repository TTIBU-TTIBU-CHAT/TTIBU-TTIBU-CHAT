import { useEffect } from 'react'
import { useModelStore } from '@store/useModelStore'

export const useModels = () => {
  const {
    providers,
    selectedIds,
    defaultId,
    tokens,
    loading,
    error,
    fetchModelsFromMe,
  } = useModelStore()

  useEffect(() => {
    fetchModelsFromMe()
  }, [fetchModelsFromMe])

  return {
    providers,
    selectedIds,
    defaultId,
    tokens,
    loading,
    error,
    fetchModelsFromMe, 
  }
}
