"""Google Gemini cloud inference provider using the official google-genai SDK."""
import json
import re
import logging
from typing import Dict, Any, Optional

from app.config import settings
from app.providers.base import BaseAIProvider
from app.schemas import ProviderDetail

logger = logging.getLogger(__name__)

class GeminiProvider(BaseAIProvider):
    def __init__(self, api_key: Optional[str] = None, model_id: Optional[str] = None):
        self._api_key = api_key or settings.gemini_api_key
        self._model_id = model_id or settings.cloud_model_id

    @property
    def name(self) -> str:
        return "cloud"

    @property
    def model_id(self) -> str:
        return self._model_id

    async def check_health(self) -> ProviderDetail:
        """Check if Gemini SDK is available and configured."""
        if not self._api_key:
            return ProviderDetail(
                name="cloud",
                model_id=self._model_id,
                status="unconfigured",
                is_available=False,
                details="GEMINI_API_KEY is not configured in backend/.env. Cloud provider is optional."
            )

        try:
            from google import genai
            client = genai.Client(api_key=self._api_key)
            # Lightweight verification - list models or verify client
            # We avoid full heavy generation in health check
            return ProviderDetail(
                name="cloud",
                model_id=self._model_id,
                status="ready",
                is_available=True,
                details=f"Gemini client initialized with model '{self._model_id}'."
            )
        except ImportError:
            return ProviderDetail(
                name="cloud",
                model_id=self._model_id,
                status="unavailable",
                is_available=False,
                details="google-genai SDK package is not installed."
            )
        except Exception as e:
            # Mask any accidental key leakage in exception messages
            err_msg = str(e)
            if self._api_key in err_msg:
                err_msg = err_msg.replace(self._api_key, "[REDACTED]")
            return ProviderDetail(
                name="cloud",
                model_id=self._model_id,
                status="error",
                is_available=False,
                details=f"Gemini initialization error: {err_msg}"
            )

    def _extract_json(self, raw_text: str) -> Dict[str, Any]:
        """Robustly extract JSON from model output."""
        clean = raw_text.strip()
        try:
            return json.loads(clean)
        except json.JSONDecodeError:
            pass

        fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", clean, re.IGNORECASE)
        if fence_match:
            try:
                return json.loads(fence_match.group(1).strip())
            except json.JSONDecodeError:
                pass

        brace_match = re.search(r"(\{[\s\S]*\})", clean)
        if brace_match:
            try:
                return json.loads(brace_match.group(1).strip())
            except json.JSONDecodeError:
                pass

        raise ValueError(f"Failed to parse valid JSON from Gemini output: {raw_text[:200]}...")

    async def generate_json(self, prompt: str, system_prompt: Optional[str] = None) -> Dict[str, Any]:
        """Call Gemini model requesting JSON output."""
        if not self._api_key:
            raise RuntimeError(
                "Gemini API key is not configured. Cloud provider requires GEMINI_API_KEY in backend/.env or environment."
            )

        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=self._api_key)
            
            # Combine system prompt if provided
            contents = []
            if system_prompt:
                contents.append(f"System Instructions:\n{system_prompt}\n\nTask:\n")
            contents.append(prompt)

            full_prompt = "".join(contents)

            config = types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2,
            )

            # Note: client.models.generate_content is synchronous in genai client, or client.aio.models
            # Let's check if client.aio is available or run in thread
            import asyncio
            loop = asyncio.get_event_loop()
            
            def _call():
                return client.models.generate_content(
                    model=self._model_id,
                    contents=full_prompt,
                    config=config
                )

            response = await loop.run_in_executor(None, _call)
            
            if not response or not response.text:
                raise RuntimeError("Gemini returned an empty response.")

            return self._extract_json(response.text)

        except Exception as e:
            err_msg = str(e)
            if self._api_key and self._api_key in err_msg:
                err_msg = err_msg.replace(self._api_key, "[REDACTED]")
            logger.error(f"Gemini generation error: {err_msg}")
            raise RuntimeError(f"Cloud provider error ({self._model_id}): {err_msg}")
