import { useReducer, useCallback } from 'react'

/** @typedef {{id:string, role:'user'|'assistant'|'system', content:string, ts:number, status?:'pending'|'sent'|'error'}} ChatMessage */

function id() {
  return Math.random().toString(36).slice(2, 9)
}

function reducer(state, action) {
  switch (action.type) {
    case 'init':
      return action.payload
    case 'add':
      return [...state, action.payload]
    case 'update':
      return state.map(m => m.id === action.id ? {...m, ...action.patch} : m)
    case 'remove':
      return state.filter(m => m.id !== action.id)
    case 'clear':
      return []
    case 'append': // 스트리밍 텍스트 추가용
      return state.map(m => m.id === action.id ? {...m, content: (m.content || '') + action.chunk} : m)
    default:
      return state
  }
}

export function useChatList(initial = []) {
  const [messages, dispatch] = useReducer(reducer, initial)

  const add = useCallback((msg) => {
    const msgWithId = { id: id(), ts: Date.now(), status: 'sent', ...msg }
    dispatch({ type: 'add', payload: msgWithId })
    return msgWithId.id
  }, [])

  const addUser = useCallback((content) => add({ role: 'user', content }), [add])
  const addAssistant = useCallback((content, extra={}) => add({ role: 'assistant', content, ...extra }), [add])

  const update = useCallback((id, patch) => dispatch({ type: 'update', id, patch }), [])
  const remove = useCallback((id) => dispatch({ type: 'remove', id }), [])
  const clear = useCallback(() => dispatch({ type: 'clear' }), [])
  const append = useCallback((id, chunk) => dispatch({ type: 'append', id, chunk }), [])

  return { messages, add, addUser, addAssistant, update, remove, clear, append }
}