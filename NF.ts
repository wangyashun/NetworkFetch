type Interceptor<T> = (value: T) => T | Promise<T>;

interface FetchWrapperConfig {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

interface UploadProgressConfig {
  onUploadProgress?: (percent: number) => void;
}

export interface FetchRequestConfig
  extends RequestInit,
    UploadProgressConfig {
  url?: string;
  params?: Record<string, any>;
  timeout?: number;
}

function buildURL(
  url: string,
  params?: Record<string, any>
): string {
  if (!params) return url;
  const query = new URLSearchParams(params).toString();
  return url.includes('?') ? `${url}&${query}` : `${url}?${query}`;
}

export function createFetch(
  defaultConfig: FetchWrapperConfig = {}
) {
  const beforeRequest: Interceptor<FetchRequestConfig>[] = [];
  const afterResponse: Interceptor<any>[] = [];

  async function request<T = any>(
    url: string,
    config: FetchRequestConfig = {}
  ): Promise<T> {
    let mergedConfig: FetchRequestConfig = {
      ...defaultConfig,
      ...config,
      headers: {
        'Content-Type': 'application/json',
        ...(defaultConfig.headers || {}),
        ...(config.headers || {})
      }
    };

    // 请求拦截器
    for (const fn of beforeRequest) {
      mergedConfig = await fn(mergedConfig);
    }

    const fullURL = buildURL(
      (defaultConfig.baseURL || '') + url,
      mergedConfig.params
    );

    // 上传进度：XHR 兜底
    if (mergedConfig.onUploadProgress && mergedConfig.body) {
      return xhrWithProgress(fullURL, mergedConfig);
    }

    const controller = new AbortController();
    const timeout =
      mergedConfig.timeout ?? defaultConfig.timeout ?? 0;

    let timer: any;
    if (timeout) {
      timer = setTimeout(() => controller.abort(), timeout);
    }

    try {
      const res = await fetch(fullURL, {
        ...mergedConfig,
        signal: controller.signal
      });

      clearTimeout(timer);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const error: any = new Error(
          errData.message || `HTTP ${res.status}`
        );
        error.status = res.status;
        error.data = errData;
        throw error;
      }

      let data = await res.json();

      // 响应拦截器
      for (const fn of afterResponse) {
        data = await fn(data);
      }

      return data;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('请求超时');
      }
      throw err;
    }
  }

  function xhrWithProgress(
    url: string,
    config: FetchRequestConfig
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(config.method || 'POST', url);

      Object.entries(config.headers || {}).forEach(
        ([k, v]) => xhr.setRequestHeader(k, v as string)
      );

      xhr.upload.onprogress = e => {
        if (e.lengthComputable && config.onUploadProgress) {
          config.onUploadProgress(
            Math.round((e.loaded / e.total) * 100)
          );
        }
      };

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          let data = JSON.parse(xhr.responseText);
          for (const fn of afterResponse) {
            data = await fn(data);
          }
          resolve(data);
        } else {
          reject(new Error(`HTTP ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network Error'));
      xhr.send(config.body as any);
    });
  }

  return {
    request,
    get<T>(url: string, config?: FetchRequestConfig) {
      return request<T>(url, { ...config, method: 'GET' });
    },
    post<T>(url: string, data?: any, config?: FetchRequestConfig) {
      return request<T>(url, {
        ...config,
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    put<T>(url: string, data?: any, config?: FetchRequestConfig) {
      return request<T>(url, {
        ...config,
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },
    delete<T>(url: string, config?: FetchRequestConfig) {
      return request<T>(url, { ...config, method: 'DELETE' });
    },
    interceptors: {
      request: {
        use: (fn: Interceptor<FetchRequestConfig>) =>
          beforeRequest.push(fn)
      },
      response: {
        use: (fn: Interceptor<any>) => afterResponse.push(fn)
      }
    }
  };
}
