<template>
  <div
    class="widget-container"
    data-tauri-drag-region
    @mousedown="onMouseDown"
    @contextmenu.prevent
  >
    <!-- Three.js canvas mount point -->
    <div ref="canvasContainer" class="canvas-container"></div>

    <!-- Drag-over overlay -->
    <Transition name="fade">
      <div v-if="dropOverlay" class="drag-overlay">
        <div class="drag-hint">
          <svg class="delete-icon" viewBox="0 0 24 24" width="48" height="48">
            <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
          <p class="drag-text">释放文件以删除</p>
          <p class="drag-sub">Drop files to delete</p>
        </div>
      </div>
    </Transition>

    <!-- Pulse animation layer -->
    <div v-if="pulsing" class="pulse-ring"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { useBlackHole } from './composables/useBlackHole.js';
import { useFileDrop } from './composables/useFileDrop.js';

const canvasContainer = ref(null);
const pulsing = ref(false);

// Settings cache (re-read on each drop)
const settings = ref({
  confirm_delete: true,
  permanent_delete: false,
});

// --- Three.js Black Hole ---
const { init: initBlackHole, cleanup: cleanupBlackHole, setDragOver, switchModel } =
  useBlackHole(canvasContainer);

// --- File Drop ---
const { isDragOver: dropOverlay, init: initDrop, cleanup: cleanupDrop } =
  useFileDrop(settings);

// Sync drag state to Three.js glow
watch(dropOverlay, (val) => {
  setDragOver(val);
});

// --- Pulse on file deletion ---
let pulseTimer = null;
function triggerPulse() {
  pulsing.value = true;
  setDragOver(true);
  clearTimeout(pulseTimer);
  pulseTimer = setTimeout(() => {
    pulsing.value = false;
    setDragOver(false);
  }, 800);
}

// --- Window Dragging ---
function onMouseDown(e) {
  // Only handle left-click when not in a drag-drop operation
  if (e.button === 0 && !dropOverlay.value) {
    getCurrentWindow().startDragging();
  }
}

// --- Lifecycle ---
let unlistenModelChange = null;
let unlistenModelXFile = null;

onMounted(async () => {
  // 读取持久化的活动模型
  let activeModel = null;
  try {
    const saved = await invoke('get_settings');
    activeModel = saved.active_model;
    // model-x 依赖用户选择的文件，不可在重启后直接恢复
    if (activeModel === 'model-x') {
      activeModel = 'model-1';
    }
  } catch (e) {
    console.error('读取设置失败:', e);
  }

  initBlackHole(activeModel);
  await initDrop();

  // Listen for model switch events from tray menu
  unlistenModelChange = await listen('model-changed', (event) => {
    switchModel(event.payload);
  });

  // Listen for model-x file selection from tray
  unlistenModelXFile = await listen('model-x-file-selected', async (event) => {
    const filePath = event.payload;
    try {
      // load_glb_file 返回原始二进制 ArrayBuffer，不经 JSON 序列化
      const data = await invoke('load_glb_file', { path: filePath });
      const blob = new Blob([data], { type: 'model/gltf-binary' });
      const blobUrl = URL.createObjectURL(blob);
      await switchModel('model-x', { fileUrl: blobUrl });
      // 更新托盘勾选状态（不持久化 model-x 到配置）
      await invoke('mark_tray_active', { modelId: 'model-x' });
    } catch (e) {
      console.error('模型X号: 加载 GLB 文件失败', e);
    }
  });

  // Listen for pulse events
  window.addEventListener('blackhole-pulse', triggerPulse);
});

onUnmounted(() => {
  cleanupBlackHole();
  cleanupDrop();
  clearTimeout(pulseTimer);
  window.removeEventListener('blackhole-pulse', triggerPulse);
  if (unlistenModelChange) unlistenModelChange();
  if (unlistenModelXFile) unlistenModelXFile();
});
</script>