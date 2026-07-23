import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { ask } from '@tauri-apps/plugin-dialog';

export function useFileDrop(settings) {
    const isDragOver = ref(false);
    const lastResult = ref(null);

    let unlisten = null;

    async function init() {
        try {
            unlisten = await getCurrentWebview().onDragDropEvent(async (event) => {
                const { type } = event.payload;

                if (type === 'over') {
                    isDragOver.value = true;
                } else if (type === 'leave') {
                    isDragOver.value = false;
                } else if (type === 'drop') {
                    isDragOver.value = false;
                    const paths = event.payload.paths;
                    if (paths && paths.length > 0) {
                        await handleDrop(paths);
                    }
                } else if (type === 'cancel') {
                    isDragOver.value = false;
                }
            });
        } catch (e) {
            console.warn('Drag-drop event listener failed:', e);
        }
    }

    async function handleDrop(paths) {
        // Re-read latest settings each time
        let currentSettings = settings;
        try {
            const fresh = await invoke('get_settings');
            currentSettings = fresh;
        } catch {
            // Use whatever we had cached
        }

        // Show confirmation dialog if enabled
        if (currentSettings.confirm_delete) {
            const actionText = currentSettings.permanent_delete ? '永久删除' : '移到回收站';
            const confirmed = await ask(
                `确定要${actionText}以下 ${paths.length} 个文件吗？\n\n${paths.slice(0, 5).join('\n')}${paths.length > 5 ? '\n...等' : ''}`,
                {
                    title: 'Blackhole Widget - 删除确认',
                    kind: 'warning',
                }
            );
            if (!confirmed) return;
        }

        // Execute deletion
        try {
            const result = await invoke('delete_files', {
                paths,
            });
            lastResult.value = result;

            // Emit event for pulse animation
            window.dispatchEvent(new CustomEvent('blackhole-pulse'));
        } catch (e) {
            console.error('Delete failed:', e);
        }
    }

    function cleanup() {
        if (unlisten) {
            unlisten();
            unlisten = null;
        }
    }

    return { isDragOver, lastResult, init, cleanup };
}