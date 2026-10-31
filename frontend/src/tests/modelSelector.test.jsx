import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import ModelSelector from '../components/ModelSelector';
import * as api from '../api';

vi.mock('../api', () => ({
  fetchOllamaModels: vi.fn(),
  fetchOllamaStatus: vi.fn(),
  selectOllamaModel: vi.fn(),
  pullOllamaModel: vi.fn(),
  fetchPullStatus: vi.fn(),
  cancelPull: vi.fn(),
}));

const MOCK_MODELS_RESP = {
  models: [
    {
      name: 'qwen3:1.7b',
      size: 1359293444,
      size_formatted: '1.27 GB',
      family: 'qwen3',
      parameter_size: '2.0B',
      quantization_level: 'Q4_K_M',
      is_installed: true,
      is_selected: true,
      is_multimodal: false,
      resource_tier: 'lightweight',
      resource_warning: 'Lightweight - Recommended for 8GB RAM CPU'
    },
    {
      name: 'gemma4:e4b',
      size: 6583656505,
      size_formatted: '6.13 GB',
      family: 'gemma4',
      parameter_size: '7.5B',
      quantization_level: 'Q4_K_M',
      is_installed: true,
      is_selected: false,
      is_multimodal: true,
      resource_tier: 'heavy',
      resource_warning: 'Heavy - Slower inference on 8GB RAM CPU; recommend bounded context'
    }
  ],
  selected_model: 'qwen3:1.7b',
  total_count: 2
};

const MOCK_STATUS_RESP = {
  is_connected: true,
  version: '0.40.13',
  base_url: 'http://127.0.0.1:11434',
  selected_model: 'qwen3:1.7b',
  is_selected_multimodal: false,
  model_available: true,
  installed_count: 2,
  resource_tier: 'lightweight',
  details: 'Ollama connected (v0.40.13). Active model: qwen3:1.7b'
};

function renderComponent(ui) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    }
  };
}

describe('ModelSelector Component Suite', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    api.fetchOllamaModels.mockResolvedValue(MOCK_MODELS_RESP);
    api.fetchOllamaStatus.mockResolvedValue(MOCK_STATUS_RESP);
    api.selectOllamaModel.mockResolvedValue({
      status: 'success',
      selected_model: 'gemma4:e4b',
      is_multimodal: true,
      resource_tier: 'heavy',
      resource_warning: 'Heavy - Slower inference on 8GB RAM CPU',
      message: 'Switched'
    });
  });

  it('renders initial active model and Ollama connection status', async () => {
    const { container, unmount } = renderComponent(<ModelSelector onModelChanged={vi.fn()} />);

    // Wait for async load
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(container.textContent).toContain('qwen3:1.7b');
    expect(container.textContent).toContain('Local Ollama Model');
    unmount();
  });

  it('opens dropdown and displays installed models list with metadata and resource warnings', async () => {
    const { container, unmount } = renderComponent(<ModelSelector onModelChanged={vi.fn()} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const triggerBtn = container.querySelector('.model-selector-btn');
    expect(triggerBtn).toBeTruthy();

    act(() => {
      triggerBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('Installed Ollama Models');
    expect(container.textContent).toContain('2 installed');
    expect(container.textContent).toContain('gemma4:e4b');
    expect(container.textContent).toContain('Recommended for 8GB RAM CPU');
    unmount();
  });

  it('switches model when user clicks a different model card without reloading page', async () => {
    const handleModelChanged = vi.fn();
    const { container, unmount } = renderComponent(<ModelSelector onModelChanged={handleModelChanged} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Open dropdown
    const triggerBtn = container.querySelector('.model-selector-btn');
    act(() => {
      triggerBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // Find gemma4 card
    const cards = container.querySelectorAll('.model-option-card');
    const gemmaCard = Array.from(cards).find((c) => c.textContent.includes('gemma4:e4b'));
    expect(gemmaCard).toBeTruthy();

    await act(async () => {
      gemmaCard.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(api.selectOllamaModel).toHaveBeenCalledWith('gemma4:e4b');
    expect(handleModelChanged).toHaveBeenCalledWith('gemma4:e4b', expect.any(Object));
    expect(container.textContent).toContain('Switched active local model to gemma4:e4b');
    unmount();
  });

  it('handles Ollama offline error state gracefully without blank screen', async () => {
    api.fetchOllamaModels.mockRejectedValue(new Error('Connection refused at 127.0.0.1:11434'));
    api.fetchOllamaStatus.mockResolvedValue({
      is_connected: false,
      selected_model: 'qwen3:1.7b',
      installed_count: 0,
      details: 'Cannot reach Ollama'
    });

    const { container, unmount } = renderComponent(<ModelSelector onModelChanged={vi.fn()} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(container.querySelector('.model-selector-btn')).toBeTruthy();
    expect(container.querySelector('.status-dot.offline')).toBeTruthy();
    unmount();
  });

  it('opens pull modal and supports entering a model identifier', async () => {
    const { container, unmount } = renderComponent(<ModelSelector onModelChanged={vi.fn()} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const pullBtn = container.querySelector('.btn-icon-pull');
    expect(pullBtn).toBeTruthy();

    act(() => {
      pullBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('Pull Ollama Model');
    expect(container.textContent).toContain('Resource Warning (8 GB RAM Laptop)');

    const suggestionPills = container.querySelectorAll('.suggestion-pill');
    expect(suggestionPills.length).toBeGreaterThan(0);

    act(() => {
      suggestionPills[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const chosenModel = suggestionPills[0].textContent;

    api.pullOllamaModel.mockResolvedValue({ status: 'started' });
    const form = container.querySelector('.pull-modal-body form');
    expect(form).toBeTruthy();

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(api.pullOllamaModel).toHaveBeenCalledWith(chosenModel);
    unmount();
  });
});
