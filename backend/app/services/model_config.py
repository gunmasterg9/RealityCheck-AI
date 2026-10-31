"""Centralized Ollama Model Configuration and Lifecycle Management Service.
Handles dynamic model discovery, persistence in SQLite settings, safe switching,
resource warnings for low-memory laptop hardware, and streaming pull downloads.
"""
import re
import math
import logging
import asyncio
from typing import Dict, Any, List, Optional, Tuple
import httpx

from app.config import settings
from app.database import get_system_setting, set_system_setting
from app.schemas import (
    OllamaModelInfo,
    OllamaModelsResponse,
    OllamaStatusResponse,
    ModelSelectResponse,
    ModelPullStatusResponse
)

logger = logging.getLogger(__name__)

SAFE_MODEL_NAME_REGEX = re.compile(r"^[a-zA-Z0-9_\-\.:/]{1,100}$")
SETTING_KEY_SELECTED_MODEL = "selected_local_model"

class ModelConfigService:
    def __init__(self, base_url: Optional[str] = None):
        self._base_url = (base_url or settings.ollama_base_url).rstrip("/")
        self._selected_model: Optional[str] = None
        self._lock = asyncio.Lock()
        
        # Pull task state
        self._pull_task: Optional[asyncio.Task] = None
        self._pull_cancel_requested: bool = False
        self._pull_state: Dict[str, Any] = {
            "status": "idle",
            "model": None,
            "completed_bytes": 0,
            "total_bytes": 0,
            "percentage": 0.0,
            "message": None,
            "error": None
        }

    @property
    def base_url(self) -> str:
        return self._base_url

    def _format_size(self, size_bytes: int) -> str:
        """Format raw byte count into human-readable string."""
        if not size_bytes or size_bytes <= 0:
            return "0 B"
        size_name = ("B", "KB", "MB", "GB", "TB")
        i = int(math.floor(math.log(size_bytes, 1024)))
        p = math.pow(1024, i)
        s = round(size_bytes / p, 2)
        return f"{s} {size_name[i]}"

    def _determine_resource_tier(
        self,
        size_bytes: int,
        parameter_size: Optional[str] = None
    ) -> Tuple[str, str]:
        """
        Determine model resource tier and advisory warning optimized for
        laptop development environment (Intel Core i3, 8 GB RAM, CPU-only).
        """
        # Parse parameter count if available
        param_num = None
        if parameter_size:
            match = re.search(r"([0-9]+(?:\.[0-9]+)?)\s*[BbMm]", parameter_size)
            if match:
                num = float(match.group(1))
                if "m" in parameter_size.lower():
                    param_num = num / 1000.0
                else:
                    param_num = num

        # Convert size to GB
        size_gb = size_bytes / (1024 ** 3) if size_bytes else 0.0

        if (param_num is not None and param_num <= 2.5) or (size_gb > 0 and size_gb < 2.5):
            return "lightweight", "Lightweight - Recommended for 8GB RAM CPU (Fastest response)"
        elif (param_num is not None and param_num <= 4.5) or (size_gb >= 2.5 and size_gb < 4.5):
            return "moderate", "Moderate - Suitable for CPU inference with standard response time"
        elif (param_num is not None and param_num <= 8.5) or (size_gb >= 4.5 and size_gb < 7.5):
            return "heavy", "Heavy - Slower inference on 8GB RAM CPU; recommend bounded context"
        else:
            return "extreme", "High Memory Pressure - Exceeds 8GB RAM limits, risk of OS swapping/paging"

    def _is_multimodal_model(
        self,
        model_name: str,
        family: Optional[str] = None,
        families: Optional[List[str]] = None,
        capabilities: Optional[List[str]] = None
    ) -> bool:
        """
        Detect if an Ollama model is capable of multimodal vision analysis.
        Checks Ollama capabilities, architecture family, and known vision naming patterns.
        """
        name_lower = model_name.lower()
        if capabilities and "vision" in capabilities:
            return True

        fams = [f.lower() for f in (families or [])]
        if family:
            fams.append(family.lower())

        if "clip" in fams or "gemma4" in fams or "mllama" in fams:
            return True

        known_vision_keywords = ["gemma4", "llava", "bakllava", "vision", "moondream", "qwen2-vl", "minicpm-v"]
        if any(kw in name_lower for kw in known_vision_keywords):
            return True

        return False

    async def get_ollama_version(self) -> Optional[str]:
        """Fetch running Ollama daemon version."""
        url = f"{self._base_url}/api/version"
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    return res.json().get("version")
        except Exception:
            pass
        return None

    async def get_installed_models_raw(self) -> List[Dict[str, Any]]:
        """Fetch raw models list from Ollama GET /api/tags."""
        url = f"{self._base_url}/api/tags"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    return data.get("models", [])
        except httpx.ConnectError:
            logger.warning(f"Could not connect to Ollama at {self._base_url}")
        except Exception as e:
            logger.error(f"Error querying Ollama tags: {e}")
        return []

    async def get_active_model(self) -> str:
        """
        Resolve the currently active local model following strict priority:
        1. In-memory user selection.
        2. SQLite persistent setting ('selected_local_model').
        3. Environment default ('settings.local_model_id', e.g. qwen3:1.7b).
        4. Safe fallback if selected model is not in installed tags.
        """
        async with self._lock:
            # 1. In-memory cached selection
            if self._selected_model:
                return self._selected_model

            # 2. SQLite setting
            stored = get_system_setting(SETTING_KEY_SELECTED_MODEL)
            if stored and stored.strip():
                self._selected_model = stored.strip()
                return self._selected_model

            # 3. Environment default
            env_default = settings.local_model_id
            self._selected_model = env_default
            return self._selected_model

    async def discover_models(self) -> OllamaModelsResponse:
        """
        Dynamically query installed Ollama models and build enriched response
        with hardware tiers, capabilities, and active selection status.
        """
        raw_models = await self.get_installed_models_raw()
        active_model = await self.get_active_model()

        model_infos: List[OllamaModelInfo] = []
        model_names = []

        for m in raw_models:
            name = m.get("name") or m.get("model", "")
            if not name:
                continue
            model_names.append(name)
            size = m.get("size", 0)
            details = m.get("details", {})
            family = details.get("family")
            families = details.get("families", [])
            parameter_size = details.get("parameter_size")
            quantization_level = details.get("quantization_level")
            context_length = details.get("context_length")
            capabilities = m.get("capabilities", [])

            is_multimodal = self._is_multimodal_model(name, family, families, capabilities)
            tier, warning = self._determine_resource_tier(size, parameter_size)
            is_selected = (name == active_model) or (name.split(":")[0] == active_model.split(":")[0] and ":" not in active_model)

            model_infos.append(
                OllamaModelInfo(
                    name=name,
                    size=size,
                    size_formatted=self._format_size(size),
                    family=family,
                    parameter_size=parameter_size,
                    quantization_level=quantization_level,
                    context_length=context_length,
                    is_installed=True,
                    is_selected=is_selected,
                    is_multimodal=is_multimodal,
                    resource_tier=tier,
                    resource_warning=warning,
                    modified_at=m.get("modified_at")
                )
            )

        # Handle safe fallback if active model is not installed but other models exist
        if model_names and not any(info.is_selected for info in model_infos):
            # Check if default qwen3:1.7b is available
            fallback_target = next((m for m in model_infos if "qwen3:1.7b" in m.name), model_infos[0])
            fallback_target.is_selected = True
            active_model = fallback_target.name
            async with self._lock:
                self._selected_model = active_model

        return OllamaModelsResponse(
            models=model_infos,
            selected_model=active_model,
            total_count=len(model_infos)
        )

    async def get_status(self) -> OllamaStatusResponse:
        """Inspect Ollama server connection, version, active model, and capabilities."""
        version = await self.get_ollama_version()
        is_connected = version is not None
        models_resp = await self.discover_models()
        active_model = models_resp.selected_model

        selected_info = next((m for m in models_resp.models if m.name == active_model), None)
        model_available = selected_info is not None
        is_selected_multimodal = selected_info.is_multimodal if selected_info else False
        tier = selected_info.resource_tier if selected_info else "moderate"
        warning = selected_info.resource_warning if selected_info else None

        details = (
            f"Ollama connected (v{version}). Active model: '{active_model}'."
            if is_connected
            else f"Cannot connect to Ollama at {self._base_url}. Ensure Ollama daemon is running."
        )

        return OllamaStatusResponse(
            is_connected=is_connected,
            version=version,
            base_url=self._base_url,
            selected_model=active_model,
            is_selected_multimodal=is_selected_multimodal,
            model_available=model_available,
            installed_count=models_resp.total_count,
            resource_tier=tier,
            resource_warning=warning,
            details=details
        )

    async def select_model(self, requested_model: str) -> ModelSelectResponse:
        """
        Validate and switch the active local model without restarting FastAPI.
        Persists selection to SQLite system_settings.
        """
        model_clean = requested_model.strip()
        if not SAFE_MODEL_NAME_REGEX.match(model_clean):
            raise ValueError(f"Invalid model name format: '{requested_model}'")

        # Query installed models to validate
        models_resp = await self.discover_models()
        matching_model = next((m for m in models_resp.models if m.name == model_clean), None)

        if not matching_model:
            # Check prefix / tag match (e.g. if user passed 'qwen3:1.7b' and tag is 'qwen3:1.7b')
            matching_model = next((m for m in models_resp.models if m.name.startswith(model_clean + ":") or model_clean.startswith(m.name)), None)

        if not matching_model:
            installed_list = [m.name for m in models_resp.models]
            raise ValueError(
                f"Model '{model_clean}' is not installed in local Ollama. Installed models: {installed_list}"
            )

        actual_name = matching_model.name

        # Persist and update active model
        async with self._lock:
            self._selected_model = actual_name
            set_system_setting(SETTING_KEY_SELECTED_MODEL, actual_name)

        # Notify provider manager to update its active instance
        from app.providers.manager import get_provider_manager
        pm = get_provider_manager()
        pm.set_active_local_model(actual_name)

        logger.info(f"Switched active local Ollama model to '{actual_name}' (multimodal={matching_model.is_multimodal})")

        return ModelSelectResponse(
            status="success",
            selected_model=actual_name,
            is_multimodal=matching_model.is_multimodal,
            resource_tier=matching_model.resource_tier,
            resource_warning=matching_model.resource_warning,
            message=f"Active local model successfully switched to '{actual_name}'."
        )

    def get_pull_status(self) -> ModelPullStatusResponse:
        """Retrieve live status of background model pull operation."""
        return ModelPullStatusResponse(
            status=self._pull_state["status"],
            model=self._pull_state["model"],
            completed_bytes=self._pull_state["completed_bytes"],
            total_bytes=self._pull_state["total_bytes"],
            percentage=self._pull_state["percentage"],
            message=self._pull_state["message"],
            error=self._pull_state["error"]
        )

    async def cancel_pull(self) -> bool:
        """Cancel an in-progress model download."""
        if self._pull_task and not self._pull_task.done():
            self._pull_cancel_requested = True
            self._pull_task.cancel()
            self._pull_state["status"] = "cancelled"
            self._pull_state["message"] = "Download cancelled by user."
            logger.info("Cancelled model pull by user request.")
            return True
        return False

    async def start_pull(self, model_name: str) -> None:
        """Initiate asynchronous model pull from Ollama library."""
        model_clean = model_name.strip()
        if not SAFE_MODEL_NAME_REGEX.match(model_clean):
            raise ValueError(f"Invalid model name: '{model_name}'")

        if self._pull_task and not self._pull_task.done():
            raise RuntimeError("A model download is already in progress.")

        self._pull_cancel_requested = False
        self._pull_state = {
            "status": "pulling",
            "model": model_clean,
            "completed_bytes": 0,
            "total_bytes": 0,
            "percentage": 0.0,
            "message": f"Contacting Ollama to pull '{model_clean}'...",
            "error": None
        }

        self._pull_task = asyncio.create_task(self._execute_pull(model_clean))

    async def _execute_pull(self, model_name: str) -> None:
        """Background streaming worker for Ollama POST /api/pull."""
        url = f"{self._base_url}/api/pull"
        try:
            async with httpx.AsyncClient(timeout=None) as client:
                async with client.stream("POST", url, json={"name": model_name, "stream": True}) as response:
                    if response.status_code != 200:
                        err_text = await response.aread()
                        self._pull_state["status"] = "error"
                        self._pull_state["error"] = f"HTTP {response.status_code}: {err_text.decode('utf-8', errors='ignore')}"
                        return

                    async for line in response.aiter_lines():
                        if self._pull_cancel_requested:
                            self._pull_state["status"] = "cancelled"
                            self._pull_state["message"] = "Download cancelled."
                            return

                        line_str = line.strip()
                        if not line_str:
                            continue

                        try:
                            import json
                            data = json.loads(line_str)
                            status_msg = data.get("status", "")
                            completed = data.get("completed", 0)
                            total = data.get("total", 0)
                            pct = round((completed / total * 100), 1) if total > 0 else 0.0

                            self._pull_state["message"] = status_msg
                            self._pull_state["completed_bytes"] = completed
                            self._pull_state["total_bytes"] = total
                            self._pull_state["percentage"] = pct

                            if "download" in status_msg.lower():
                                self._pull_state["status"] = "downloading"
                            elif "verifying" in status_msg.lower():
                                self._pull_state["status"] = "verifying"
                            elif status_msg == "success":
                                self._pull_state["status"] = "completed"
                                self._pull_state["percentage"] = 100.0
                                self._pull_state["message"] = f"Successfully downloaded '{model_name}'."
                                logger.info(f"Successfully finished pulling model '{model_name}'.")
                                return

                        except Exception:
                            continue

            self._pull_state["status"] = "completed"
            self._pull_state["message"] = f"Completed pull of '{model_name}'."

        except asyncio.CancelledError:
            self._pull_state["status"] = "cancelled"
            self._pull_state["message"] = "Download cancelled."
        except Exception as e:
            self._pull_state["status"] = "error"
            self._pull_state["error"] = str(e)
            logger.error(f"Error pulling model '{model_name}': {e}")

# Global singleton instance
_model_config_service: Optional[ModelConfigService] = None

def get_model_config_service() -> ModelConfigService:
    global _model_config_service
    if _model_config_service is None:
        _model_config_service = ModelConfigService()
    return _model_config_service
