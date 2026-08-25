# NetworkFetch 使用文档

一个轻量、无依赖、行为对齐 axios 的 fetch 二次封装，适用于中大型前端项目。


## 一、特性概览

- ✅ 请求 / 响应拦截器（链式）
- ✅ 超时控制（AbortController）
- ✅ 请求取消
- ✅ 404 / 500 自动进入 `catch`
- ✅ 上传进度（XHR 兜底，Safari 可用）
- ✅ 零依赖、体积小、原生支持
- ✅ API 风格接近 axios，迁移成本低

---

## 二、快速开始

### 1. 创建请求实例

```ts
import { createFetch } from './NF';

const request = createFetch({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    Authorization: 'Bearer xxx'
  }
});

export default request;
```

---

## 三、基础用法

### 1. GET 请求

```ts
const data = await request.get('/user/list', {
  params: { page: 1, size: 10 }
});
```

### 2. POST 请求

```ts
const res = await request.post('/user', {
  name: 'Tom',
  age: 18
});
```

### 3. PUT 请求

```ts
await request.put('/user/1', { name: 'Jerry' });
```

### 4. DELETE 请求

```ts
await request.delete('/user/1');
```

---

## 四、拦截器

### 1. 请求拦截器

```ts
request.interceptors.request.use(config => {
  config.headers!.Timestamp = Date.now().toString();
  return config;
});
```

### 2. 响应拦截器

```ts
request.interceptors.response.use(data => {
  // 统一解包或埋点
  return data;
});
```

> 支持多个拦截器，按注册顺序链式执行。

---

## 五、错误处理

### 1. HTTP 错误（404 / 500）

```ts
try {
  await request.get('/not-exist');
} catch (err: any) {
  console.log(err.status);   // 404
  console.log(err.message);  // 后端 message 或 HTTP 404
}
```

### 2. 请求超时

```ts
try {
  await request.get('/slow', { timeout: 3000 });
} catch (err: any) {
  console.log(err.message); // 请求超时
}
```

---

## 六、文件上传（带进度）

```ts
const formData = new FormData();
formData.append('file', file);

await request.post('/upload', formData, {
  headers: {}, // 让浏览器自动设置 Content-Type
  onUploadProgress(percent) {
    console.log(`上传进度：${percent}%`);
  }
});
```

---

## 七、请求取消

```ts
const controller = new AbortController();

request
  .get('/long-task', { signal: controller.signal })
  .catch(err => console.log(err.message));

// 主动取消
controller.abort();
```

---

## 八、配置项说明

### 1. `createFetch` 默认配置

| 参数 | 类型 | 说明 |
|---|---|---|
| baseURL | string | 接口基础路径 |
| timeout | number | 默认超时时间（ms） |
| headers | object | 默认请求头 |

### 2. 单次请求配置（`FetchRequestConfig`）

| 参数 | 类型 | 说明 |
|---|---|---|
| url | string | 接口路径 |
| method | string | 请求方法 |
| params | object | URL 查询参数 |
| body | any | 请求体 |
| headers | object | 请求头 |
| timeout | number | 本次超时时间 |
| signal | AbortSignal | 取消信号 |
| onUploadProgress | (percent: number) => void | 上传进度回调 |

---

## 九、与 axios 能力对照

| 能力 | axios | NF |
|---|---|---|
| 拦截器 | ✅ | ✅ |
| 超时 | ✅ | ✅ |
| 取消请求 | ✅ | ✅ |
| 上传进度 | ✅ | ✅（XHR 兜底） |
| 404/500 → catch | ✅ | ✅ |
| 包体积 | ~13KB | **0KB** |
| 第三方依赖 | 有 | **无** |

---
