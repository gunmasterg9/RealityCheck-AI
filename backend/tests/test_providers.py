"""Unit tests for Ollama and Gemini provider implementations and JSON extraction."""
import pytest
from app.providers.ollama import OllamaProvider
from app.providers.gemini import GeminiProvider

def test_ollama_json_extraction_clean():
    provider = OllamaProvider()
    raw = '{"status": "ok", "verdict": "supported"}'
    parsed = provider._extract_json(raw)
    assert parsed["status"] == "ok"
    assert parsed["verdict"] == "supported"

def test_ollama_json_extraction_markdown_fence():
    provider = OllamaProvider()
    raw = """Here is the audit response:
```json
{
  "initial_verdict": "insufficient_evidence",
  "confidence": 0.25
}
```
Thank you for using the model."""
    parsed = provider._extract_json(raw)
    assert parsed["initial_verdict"] == "insufficient_evidence"
    assert parsed["confidence"] == 0.25

def test_ollama_json_extraction_raw_braces():
    provider = OllamaProvider()
    raw = """Some text before { "verdict": "mixed", "confidence": 0.5 } some text after."""
    parsed = provider._extract_json(raw)
    assert parsed["verdict"] == "mixed"

def test_gemini_unconfigured_health():
    provider = GeminiProvider(api_key=None)
    assert provider.name == "cloud"
    # When api_key is None, check_health must return status="unconfigured"
    import asyncio
    health = asyncio.run(provider.check_health())
    assert health.status == "unconfigured"
    assert health.is_available is False

def test_gemini_json_extraction_markdown():
    provider = GeminiProvider(api_key=None)
    raw = "```\n{\"verdict\": \"contradicted\"}\n```"
    parsed = provider._extract_json(raw)
    assert parsed["verdict"] == "contradicted"

