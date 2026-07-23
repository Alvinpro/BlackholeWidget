<template>
  <div class="settings-window">
    <h2 class="title">Blackhole Widget 设置</h2>

    <div class="setting-item">
      <div class="setting-label">
        <span class="setting-name">删除前提示确认</span>
        <span class="setting-desc">拖放文件后弹出确认对话框</span>
      </div>
      <label class="toggle">
        <input
          type="checkbox"
          v-model="form.confirm_delete"
          @change="save"
        />
        <span class="toggle-slider"></span>
      </label>
    </div>

    <div class="setting-item">
      <div class="setting-label">
        <span class="setting-name">永久删除</span>
        <span class="setting-desc">不经回收站，直接从磁盘删除文件</span>
      </div>
      <label class="toggle">
        <input
          type="checkbox"
          v-model="form.permanent_delete"
          @change="save"
        />
        <span class="toggle-slider"></span>
      </label>
    </div>

    <div v-if="saved" class="save-hint">设置已保存</div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { emit } from '@tauri-apps/api/event';

const form = reactive({
  confirm_delete: true,
  permanent_delete: false,
});

const saved = ref(false);
let saveTimer = null;

async function load() {
  try {
    const settings = await invoke('get_settings');
    form.confirm_delete = settings.confirm_delete;
    form.permanent_delete = settings.permanent_delete;
  } catch (e) {
    console.error('加载设置失败:', e);
  }
}

async function save() {
  try {
    await invoke('save_settings', {
      settings: {
        confirm_delete: form.confirm_delete,
        permanent_delete: form.permanent_delete,
      },
    });
    // Notify main window
    try {
      await emit('settings-changed', {
        confirm_delete: form.confirm_delete,
        permanent_delete: form.permanent_delete,
      });
    } catch {
      // Event emit might fail if main window is hidden, ignore
    }

    saved.value = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saved.value = false;
    }, 1500);
  } catch (e) {
    console.error('保存设置失败:', e);
  }
}

onMounted(load);
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #1a1a2e;
  color: #e0e0e0;
  user-select: none;
}

.settings-window {
  padding: 24px;
}

.title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 20px;
  color: #ffffff;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #2a2a4a;
}

.setting-item:last-of-type {
  border-bottom: none;
}

.setting-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.setting-name {
  font-size: 14px;
  font-weight: 500;
}

.setting-desc {
  font-size: 12px;
  color: #888;
}

/* Toggle switch */
.toggle {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #3a3a5a;
  border-radius: 24px;
  transition: background-color 0.2s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: #ffffff;
  border-radius: 50%;
  transition: transform 0.2s;
}

.toggle input:checked + .toggle-slider {
  background-color: #7b2fff;
}

.toggle input:checked + .toggle-slider::before {
  transform: translateX(20px);
}

.save-hint {
  margin-top: 16px;
  text-align: center;
  font-size: 12px;
  color: #4caf50;
}
</style>