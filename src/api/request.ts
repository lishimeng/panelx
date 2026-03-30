import axios, { type AxiosInstance, type AxiosResponse } from 'axios'
import type { PanelXRequestConfig, PanelXResponse, PanelXError } from '../types/api'

export interface PanelXRequestApi {
  get<T = any>(url: string, config?: PanelXRequestConfig): Promise<PanelXResponse<T>>
  post<T = any>(url: string, data?: any, config?: PanelXRequestConfig): Promise<PanelXResponse<T>>
  put<T = any>(url: string, data?: any, config?: PanelXRequestConfig): Promise<PanelXResponse<T>>
  delete<T = any>(url: string, config?: PanelXRequestConfig): Promise<PanelXResponse<T>>
}

class PanelXRequest {
  private instance: AxiosInstance

  constructor() {
    this.instance = axios.create({
      baseURL: '',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    this.instance.interceptors.response.use(
      (response: AxiosResponse<PanelXResponse>) => {
        if (response.data.code !== 200) {
          throw new Error(response.data.message)
        }
        return response
      },
      (error) => {
        const panelXError: PanelXError = {
          code: error.response?.status || 500,
          message: error.message || 'Network error',
          details: error.response?.data
        }
        return Promise.reject(panelXError)
      }
    )
  }

  get<T = any>(url: string, config?: PanelXRequestConfig): Promise<PanelXResponse<T>> {
    return this.instance.get(url, config)
  }

  post<T = any>(url: string, data?: any, config?: PanelXRequestConfig): Promise<PanelXResponse<T>> {
    return this.instance.post(url, data, config)
  }

  put<T = any>(url: string, data?: any, config?: PanelXRequestConfig): Promise<PanelXResponse<T>> {
    return this.instance.put(url, data, config)
  }

  delete<T = any>(url: string, config?: PanelXRequestConfig): Promise<PanelXResponse<T>> {
    return this.instance.delete(url, config)
  }
}

export const request: PanelXRequestApi = new PanelXRequest()
export default request