#!/usr/bin/env python3
"""HuggingFace 모델 미리 다운로드 스크립트"""

from transformers import AutoTokenizer, AutoModelForCausalLM
from sentence_transformers import SentenceTransformer
import torch
import sys

print('=== Downloading HuggingFace Models ===')

print('[1/2] Downloading Qwen/Qwen2.5-0.5B...')
try:
    AutoTokenizer.from_pretrained('Qwen/Qwen2.5-0.5B')
    AutoModelForCausalLM.from_pretrained(
        'Qwen/Qwen2.5-0.5B',
        torch_dtype=torch.float32,
        low_cpu_mem_usage=True,
    )
    print('✓ Qwen/Qwen2.5-0.5B downloaded successfully')
except Exception as e:
    print(f'✗ Failed to download Qwen/Qwen2.5-0.5B: {e}', file=sys.stderr)

print('[2/2] Downloading jhgan/ko-sroberta-multitask...')
try:
    SentenceTransformer('jhgan/ko-sroberta-multitask')
    print('✓ jhgan/ko-sroberta-multitask downloaded successfully')
except Exception as e:
    print(f'✗ Failed to download jhgan/ko-sroberta-multitask: {e}', file=sys.stderr)

print('=== Model download process completed ===')
