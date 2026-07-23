<template>
  <div
    class="widget-container"
    data-tauri-drag-region
    @mousedown="onMouseDown"
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
const { init: initBlackHole, cleanup: cleanupBlackHole, setDragOver } =
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
onMounted(async () => {
  initBlackHole();
  await initDrop();

  // Listen for pulse events
  window.addEventListener('blackhole-pulse', triggerPulse);
});

onUnmounted(() => {
  cleanupBlackHole();
  cleanupDrop();
  clearTimeout(pulseTimer);
  window.removeEventListener('blackhole-pulse', triggerPulse);
});
</script>