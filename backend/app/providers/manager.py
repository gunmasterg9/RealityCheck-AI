"""Configurable Provider Manager for RealityCheck AI.
Manages Cloud Gemini, Local Qwen 3 1.7B, and Optional Gemma 4 with safe auto-fallback,
strict mode enforcement, and transparent provider audit labeling.
"""
import time
import logging
import asyncio
from typing import Dict, Any, Optional, Tuple, List, Literal
from pydantic import BaseModel, Field

from app.config import settings
from app.providers.base import BaseAIProvider
from app.providers.ollama import OllamaProvider
from app.providers.gemini import GeminiProvider
from app.schemas import ProviderStatusResponse, ProviderDetail

logger = logging.getLogger(__name__)

InferenceMode = Literal["auto", "cloud", "local", "offline"]

class ProviderExecutionResult(BaseModel):
    data: Dict[str, Any]
    provider_used: str
    model_used: str
    fallback_occurred: bool = False
    fallback_reason: Optional[str] = None
    latency_ms: int = 0

class ProviderManager:
    def __init__(
        self,
        cloud_provider: Optional[BaseAIProvider] = None,
        local_lightweight: Optional[BaseAIProvider] = None,
        local_heavy: Optional[BaseAIProvider] = None,
    ):
        self.cloud_provider = cloud_provider or GeminiProvider(
            model_id=settings.cloud_model_id
        )
        self.local_lightweight = local_lightweight or OllamaProvider(
            model_id=settings.local_model_id  # default qwen3:1.7b
        )
        self.local_heavy = local_heavy or OllamaProvider(
            model_id=settings.heavy_local_model_id  # gemma4:e4b
        )

    async def get_providers_status(self) -> ProviderStatusResponse:
        """Inspect health of both local and cloud inference options."""
        cloud_health = await self.cloud_provider.check_health()
        local_health = await self.local_lightweight.check_health()

        active_default = "cloud" if cloud_health.is_available else ("local" if local_health.is_available else "none")

        return ProviderStatusResponse(
            local=local_health,
            cloud=cloud_health,
            active_default=active_default,
            auto_fallback_enabled=cloud_health.is_available or local_health.is_available
        )

    async def select_provider(
        self,
        preference: str,
        prefer_heavy: bool = False
    ) -> Tuple[BaseAIProvider, str]:
        """
        Select provider strictly adhering to mode preference rules:
        - 'cloud': Cloud only. Never falls back to local.
        - 'local': Local only (Qwen 3 1.7B default, Gemma 4 if prefer_heavy). Never calls cloud.
        - 'offline': Strict offline local only.
        - 'auto': Cloud preferred; falls back to local if cloud unavailable or fails.
        """
        mode = preference.lower().strip()
        local_target = self.local_heavy if prefer_heavy else self.local_lightweight

        if mode == "cloud":
            health = await self.cloud_provider.check_health()
            if not health.is_available:
                raise RuntimeError(
                    f"Cloud provider ({self.cloud_provider.model_id}) requested but unavailable: {health.details}"
                )
            return self.cloud_provider, "cloud"

        elif mode in ("local", "offline"):
            health = await local_target.check_health()
            if not health.is_available:
                raise RuntimeError(
                    f"Local provider ({local_target.model_id}) requested but unavailable: {health.details}"
                )
            label = f"local ({local_target.model_id})" if mode == "local" else f"offline ({local_target.model_id})"
            return local_target, label

        elif mode == "auto":
            # Priority 1: Cloud Gemini
            cloud_health = await self.cloud_provider.check_health()
            if cloud_health.is_available:
                return self.cloud_provider, "cloud"

            # Priority 2: Local lightweight (Qwen 3 1.7B)
            local_health = await self.local_lightweight.check_health()
            if local_health.is_available:
                return self.local_lightweight, f"local ({self.local_lightweight.model_id})"

            raise RuntimeError(
                f"No inference providers available. "
                f"Cloud status: {cloud_health.details}. "
                f"Local status: {local_health.details}."
            )

        raise ValueError(f"Unknown provider mode: '{preference}'. Choose auto, cloud, local, or offline.")

    async def generate_with_fallback(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        images: Optional[List[str]] = None,
        mode: str = "auto",
        prefer_heavy: bool = False,
        timeout_seconds: Optional[int] = None
    ) -> ProviderExecutionResult:
        """
        Execute JSON generation with bounded retries, per-call timeout, and safe auto-fallback.
        Records exact provider used, model identifier, and failure/fallback notes.
        """
        timeout = timeout_seconds or settings.stage_timeout_seconds
        mode_clean = mode.lower().strip()
        start = time.perf_counter()

        local_target = self.local_heavy if prefer_heavy else self.local_lightweight

        # Explicit Cloud Mode
        if mode_clean == "cloud":
            data = await asyncio.wait_for(
                self.cloud_provider.generate_json(
                    prompt=prompt, system_prompt=system_prompt, images=images
                ),
                timeout=timeout
            )
            elapsed = int((time.perf_counter() - start) * 1000)
            return ProviderExecutionResult(
                data=data,
                provider_used="cloud",
                model_used=self.cloud_provider.model_id,
                latency_ms=elapsed
            )

        # Explicit Local / Offline Mode
        if mode_clean in ("local", "offline"):
            data = await asyncio.wait_for(
                local_target.generate_json(
                    prompt=prompt, system_prompt=system_prompt, images=images
                ),
                timeout=timeout
            )
            elapsed = int((time.perf_counter() - start) * 1000)
            return ProviderExecutionResult(
                data=data,
                provider_used=f"local ({local_target.model_id})",
                model_used=local_target.model_id,
                latency_ms=elapsed
            )

        # Auto Mode: Cloud First, fallback to Local Qwen 3 1.7B
        cloud_error: Optional[str] = None
        cloud_health = await self.cloud_provider.check_health()
        
        if cloud_health.is_available:
            try:
                data = await asyncio.wait_for(
                    self.cloud_provider.generate_json(
                        prompt=prompt, system_prompt=system_prompt, images=images
                    ),
                    timeout=timeout
                )
                elapsed = int((time.perf_counter() - start) * 1000)
                return ProviderExecutionResult(
                    data=data,
                    provider_used="cloud",
                    model_used=self.cloud_provider.model_id,
                    latency_ms=elapsed
                )
            except Exception as e:
                cloud_error = str(e)
                logger.warning(
                    f"Auto mode: Cloud inference failed ({cloud_error[:80]}). Falling back to local {self.local_lightweight.model_id}."
                )

        # Fallback to local lightweight model
        local_health = await self.local_lightweight.check_health()
        if not local_health.is_available:
            err_msg = f"Cloud inference failed ({cloud_error}) and local Ollama is unavailable ({local_health.details})."
            logger.error(err_msg)
            raise RuntimeError(err_msg)

        try:
            data = await asyncio.wait_for(
                self.local_lightweight.generate_json(
                    prompt=prompt, system_prompt=system_prompt, images=images
                ),
                timeout=timeout
            )
            elapsed = int((time.perf_counter() - start) * 1000)
            fallback_note = f"cloud error: {cloud_error[:50]}" if cloud_error else "cloud unconfigured"
            return ProviderExecutionResult(
                data=data,
                provider_used=f"local ({self.local_lightweight.model_id} fallback)",
                model_used=self.local_lightweight.model_id,
                fallback_occurred=True,
                fallback_reason=fallback_note,
                latency_ms=elapsed
            )
        except Exception as e:
            raise RuntimeError(
                f"Both cloud and local inference failed. Cloud: {cloud_error}. Local error: {str(e)}"
            )

# Global singleton
_provider_manager: Optional[ProviderManager] = None

def get_provider_manager() -> ProviderManager:
    global _provider_manager
    if _provider_manager is None:
        _provider_manager = ProviderManager()
    return _provider_manager
