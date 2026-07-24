/**
 * 模型注册表
 * 每个模型通过 id 注册，包含名称和动态加载函数
 */
const modelRegistry = {
    'model-1': {
        name: '模型1号',
        loader: () => import('./model-1.js'),
    },
    'model-2': {
        name: '模型2号',
        loader: () => import('./model-2.js'),
    },
    'model-3': {
        name: '模型3号',
        loader: () => import('./model-3.js'),
    },
    'model-4': {
        name: '模型4号',
        loader: () => import('./model-4.js'),
    },
};

/** 默认模型 ID */
export const DEFAULT_MODEL = 'model-1';

/** 获取所有模型列表 */
export function getModelList() {
    return Object.entries(modelRegistry).map(([id, model]) => ({
        id,
        name: model.name,
    }));
}

/** 加载指定模型 */
export async function loadModel(id) {
    const model = modelRegistry[id];
    if (!model) {
        console.warn(`模型 "${id}" 不存在，使用默认模型`);
        return modelRegistry[DEFAULT_MODEL].loader();
    }
    return model.loader();
}
