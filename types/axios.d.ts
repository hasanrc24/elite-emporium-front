import 'axios';

declare module 'axios' {
  interface AxiosRequestConfig {
    skipAuthRefresh?: boolean;
    _retried?: boolean;
  }

  interface InternalAxiosRequestConfig {
    skipAuthRefresh?: boolean;
    _retried?: boolean;
  }
}
