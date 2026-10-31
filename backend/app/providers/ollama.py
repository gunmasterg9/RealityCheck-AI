"""Ollama local inference provider for Gemma 4 with Vision/Multimodal support."""
import json
import re
import logging
from typing import Dict, Any, Optional, List
import httpx

from app.config import settings
from app.providers.base import BaseAIProvider
from app.schemas import ProviderDetail

logger = logging.getLogger(__name__)

class OllamaProvider(BaseAIProvider):
    def __init__(self, base_url: Optional[str] = None, model_id: Optional[str] = None, timeout_seconds: Optional[int] = None):
        self._base_url = (base_url or settings.ollama_base_url).rstrip("/")
        self._model_id = model_id or settings.local_model_id
        self._timeout_seconds = timeout_seconds or settings.inference_timeout_seconds

    @property
    def name(self) -> str:
        return "local"

    @property
    def model_id(self) -> str:
        return self._model_id

    async def check_health(self) -> ProviderDetail:
        """Inspect Ollama server and verify presence of configured model."""
        url = f"{self._base_url}/api/tags"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(url)
                if res.status_code != 200:
                    return ProviderDetail(
                        name="local",
                        model_id=self._model_id,
                        status="unavailable",
                        is_available=False,
                        is_multimodal=True,
                        details=f"Ollama returned HTTP {res.status_code}"
                    )
                data = res.json()
                models = [m.get("name", "") for m in data.get("models", [])]
                
                # Check for exact match or prefix match (e.g. gemma4:e4b)
                model_found = any(m == self._model_id or m.startswith(self._model_id + ":") or self._model_id.startswith(m) for m in models)
                
                if model_found:
                    return ProviderDetail(
                        name="local",
                        model_id=self._model_id,
                        status="ready",
                        is_available=True,
                        is_multimodal=True,
                        details=f"Ollama active with model '{self._model_id}' (Open-weights, multimodal enabled)."
                    )
                else:
                    return ProviderDetail(
                        name="local",
                        model_id=self._model_id,
                        status="unavailable",
                        is_available=False,
                        is_multimodal=True,
                        details=f"Ollama running, but model '{self._model_id}' was not found in installed tags: {models}"
                    )
        except httpx.ConnectError:
            return ProviderDetail(
                name="local",
                model_id=self._model_id,
                status="unavailable",
                is_available=False,
                is_multimodal=True,
                details=f"Could not connect to Ollama at {self._base_url}. Ensure Ollama is running."
            )
        except Exception as e:
            return ProviderDetail(
                name="local",
                model_id=self._model_id,
                status="error",
                is_available=False,
                is_multimodal=True,
                details=f"Error checking Ollama status: {str(e)}"
            )

    def _clean_base64_image(self, img_str: str) -> str:
        """Strip data URI header if present (e.g. data:image/png;base64,...)."""
        if "," in img_str:
            return img_str.split(",", 1)[1].strip()
        return img_str.strip()

    def _extract_json(self, raw_text: str) -> Dict[str, Any]:
        """Robustly parse JSON even if enclosed in markdown code blocks or containing preamble."""
        clean = raw_text.strip()
        # Direct attempt
        try:
            return json.loads(clean)
        except json.JSONDecodeError:
            pass

        # Try extracting from ```json ... ``` or ``` ... ```
        fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", clean, re.IGNORECASE)
        if fence_match:
            try:
                return json.loads(fence_match.group(1).strip())
            except json.JSONDecodeError:
                pass

        # Try finding outer-most braces { ... }
        brace_match = re.search(r"(\{[\s\S]*\})", clean)
        if brace_match:
            try:
                return json.loads(brace_match.group(1).strip())
            except json.JSONDecodeError:
                pass

        raise ValueError(f"Failed to parse valid JSON from model output: {raw_text[:200]}...")

    async def generate_json(
        self,
        prompt: Optional[str] = None,
        system_prompt: Optional[str] = None,
        images: Optional[List[str]] = None,
        user_prompt: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Execute chat inference with Ollama requesting JSON output format and optional multimodal images."""
        final_prompt = prompt or user_prompt or ""
        url = f"{self._base_url}/api/chat"
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        
        user_message: Dict[str, Any] = {"role": "user", "content": final_prompt}
        if images:
            cleaned_images = [self._clean_base64_image(img) for img in images if img and img.strip()]
            if cleaned_images:
                user_message["images"] = cleaned_images

        messages.append(user_message)

        payload = {
            "model": self._model_id,
            "messages": messages,
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.2,
                "top_p": 0.9,
                "num_ctx": 8192,
                "num_predict": 1024,
            }
        }

        try:
            async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
                res = await client.post(url, json=payload)
                if res.status_code != 200:
                    raise RuntimeError(f"Ollama inference failed with HTTP {res.status_code}: {res.text}")
                
                data = res.json()
                content = data.get("message", {}).get("content", "")
                if not content:
                    raise RuntimeError("Ollama returned an empty response.")
                
                return self._extract_json(content)
        except httpx.TimeoutException:
            raise TimeoutError(f"Ollama inference timed out after {self._timeout_seconds}s for model '{self._model_id}'.")
        except httpx.ConnectError:
            raise ConnectionError(f"Cannot reach Ollama at {self._base_url}. Is Ollama running?")
