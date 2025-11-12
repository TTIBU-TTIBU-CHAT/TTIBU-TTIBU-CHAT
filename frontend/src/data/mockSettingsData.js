export const mockUsageData = {
  totalTokens: 3135,
  details: [
    { model: 'Gemini', tokens: 1000 },
    { model: 'OpenAI', tokens: 1000 },
    { model: 'Claude', tokens: 1000 },
  ],
}

export const mockApiKeys = [
  {
    id: 1,
    name: 'OpenAI',
    apiKey: 'sk-****************',
    status: '활성',
    expireDate: '2025-10-24',
  },
  {
    id: 2,
    name: 'Gemini',
    apiKey: 'g-****************',
    status: '비활성',
    expireDate: '2025-12-01',
  },
  {
    id: 3,
    name: 'Claude',
    apiKey: 'c-****************',
    status: '비활성',
    expireDate: '2026-02-15',
  },
]

export const mockModels = {
  OpenAI: [
    { id: 'gpt5', name: 'gpt 5', desc: 'OpenAI의 텍스트 생성 모델', selected: true, isDefault: true },
    { id: 'gpt5-mini', name: 'gpt 5 mini', desc: '경량 텍스트 생성 모델', selected: false, isDefault: false },
    { id: 'gpt5-nano', name: 'gpt 5 nano', desc: '초경량 모델', selected: false, isDefault: false },
    { id: 'gpt41', name: 'gpt 4.1', desc: '이전 세대 고성능 모델', selected: false, isDefault: false },
    { id: 'gpt41-mini', name: 'gpt 4.1 mini', desc: '경량 모델', selected: false, isDefault: false },
    { id: 'gpt41-nano', name: 'gpt 4.1 nano', desc: '초경량 모델', selected: false, isDefault: false },
  ],
  Gemini: [
    { id: 'gemini1', name: 'Gemini 1.5 Pro', desc: '구글 Gemini 모델', selected: false, isDefault: false },
  ],
  Claude: [
    { id: 'claude3', name: 'Claude 3 Opus', desc: 'Anthropic 모델', selected: false, isDefault: false },
  ],
}
