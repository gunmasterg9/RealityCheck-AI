"""Google Gemini cloud inference provider using the official google-genai SDK with multimodal support."""
import json
import re
import base64
import logging
from typing import Dict, Any, Optional, List

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
                is_multimodal=True,
                details="GEMINI_API_KEY is not configured in backend/.env. Cloud provider is optional."
            )

        try:
            from google import genai
            client = genai.Client(api_key=self._api_key)
            return ProviderDetail(
                name="cloud",
                model_id=self._model_id,
                status="ready",
                is_available=True,
                is_multimodal=True,
                details=f"Gemini client initialized with model '{self._model_id}' (Hosted Gemma/Gemini)."
            )
        except ImportError:
            return ProviderDetail(
                name="cloud",
                model_id=self._model_id,
                status="unavailable",
                is_available=False,
                is_multimodal=True,
                details="google-genai SDK package is not installed."
            )
        except Exception as e:
            err_msg = str(e)
            if self._api_key in err_msg:
                err_msg = err_msg.replace(self._api_key, "[REDACTED]")
            return ProviderDetail(
                name="cloud",
                model_id=self._model_id,
                status="error",
                is_available=False,
                is_multimodal=True,
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

    async def generate_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        images: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Call Gemini model requesting JSON output and optional images."""
        if not self._api_key:
            raise RuntimeError(
                "Gemini API key is not configured. Cloud provider requires GEMINI_API_KEY in backend/.env or environment."
            )

        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=self._api_key)
            
            contents = []
            if system_prompt:
                contents.append(f"System Instructions:\n{system_prompt}\n\nTask:\n")
            contents.append(prompt)

            # Process any multimodal image parts
            if images:
                for img_data in images:
                    if not img_data or not img_data.strip():
                        continue
                    mime_type = "image/png"
                    raw_b64 = img_data.strip()
                    if "," in raw_b64:
                        prefix, raw_b64 = raw_b64.split(",", 1)
                        if "image/jpeg" in prefix:
                            mime_type = "image/jpeg"
                        elif "image/webp" in prefix:
                            mime_type = "image/webp"
                    
                    img_bytes = base64.b64decode(raw_b64)
                    part = types.Part.from_bytes(data=img_bytes, mime_type=mime_type)
                    contents.append(part)

            config = types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2,
            )

            import asyncio
            loop = asyncio.get_event_loop()
            
            def _call():
                return client.models.generate_content(
                    model=self._model_id,
                    contents=contents,
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
