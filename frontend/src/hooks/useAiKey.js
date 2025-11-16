import { aiKeyService } from '@services/aiKeyService'
import { useAiKeyStore } from '@store/useAiKeyStore'

export const useAiKey = () => {
  const { 
    providers, 
    fetchProviders, 
    fetchKey, 
    selectedKey, 
    fetchAllKeys 
  } = useAiKeyStore()

  const createKey = async (payload) => {
    try {
      const { data } = await aiKeyService.createKey(payload)
      console.log('[CREATE_KEY SUCCESS]', data)
      return data
    } catch (err) {
      console.error('[CREATE_KEY ERROR]', err.response?.data || err.message)
      throw err
    }
  }

  const updateKey = async (payload) => {
    const { data } = await aiKeyService.updateKey(payload)
    return data
  }

  const deleteKey = async (keyUid) => {
    const { data } = await aiKeyService.deleteKey(keyUid)
    return data
  }

  return {
    providers,
    fetchProviders,
    fetchKey,
    fetchAllKeys,
    selectedKey,
    createKey,
    updateKey,
    deleteKey,
  }
}
