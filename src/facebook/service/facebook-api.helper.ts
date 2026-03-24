import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosInstance, AxiosError } from 'axios'
import { ErrorCode } from '@/common/enums'
import { GRAPH_API_BASE } from '@/facebook/constants'

@Injectable()
export class FacebookAPIHelper {
  private readonly logger = new Logger(FacebookAPIHelper.name)
  private readonly client: AxiosInstance

  constructor(config: ConfigService) {
    const accessToken = config.get<string>('FACEBOOK_ACCESS_TOKEN', '')
    this.client = axios.create({
      baseURL: GRAPH_API_BASE,
      timeout: 30000,
      params: { access_token: accessToken },
    })
  }

  async fetchRequired<T>(path: string, params: Record<string, unknown> = {}): Promise<T> {
    try {
      const { data } = await this.client.get<T>(path, { params })
      if (!data) {
        throw this.getNotFoundError(path)
      }
      return data
    } catch (error) {
      if (this.isAxiosError(error) && error.response?.status === 404) {
        throw this.getNotFoundError(path)
      }
      this.logAndThrowApiError(error, path)
    }
  }

  async fetchOptional<T>(path: string, params: Record<string, unknown> = {}): Promise<T[]> {
    try {
      const { data } = await this.client.get<{ data: T[] }>(path, { params })
      return data?.data ?? []
    } catch (error) {
      if (this.isAxiosError(error) && error.response?.status === 404) {
        return []
      }
      this.logger.warn(`Fetch ${path} failed: ${this.getErrorMessage(error)}`)
      return []
    }
  }

  async fetchList<T>(path: string, params: Record<string, unknown> = {}): Promise<T[]> {
    try {
      const { data } = await this.client.get<{ data: T[] }>(path, { params })
      return data?.data ?? []
    } catch (error) {
      this.logAndThrowApiError(error, path)
    }
  }

  private getNotFoundError(path: string) {
    if (path.includes('/campaigns') || /^\/\d+$/.test(path)) {
      return ErrorCode.CAMPAIGN_NOT_FOUND
    }
    if (path.includes('/adsets')) {
      return ErrorCode.ADSET_NOT_FOUND
    }
    if (path.includes('/ads')) {
      return ErrorCode.AD_NOT_FOUND
    }
    if (path.includes('/adaccounts')) {
      return ErrorCode.ACCOUNT_NOT_FOUND
    }
    return ErrorCode.FB_API_ERROR
  }

  private logAndThrowApiError(error: unknown, path: string): never {
    if (this.isAxiosError(error)) {
      const status = error.response?.status
      const data = error.response?.data as
        | { error?: { message?: string; code?: number } }
        | undefined
      const message = data?.error?.message ?? error.message ?? 'Unknown API error'

      if (status === 404) {
        throw this.getNotFoundError(path)
      }
      if (status === 403) {
        throw ErrorCode.INSUFFICIENT_PERMISSIONS
      }

      if (
        status === 400 &&
        (message.includes('does not exist') ||
          message.includes('cannot be loaded') ||
          data?.error?.code === 100)
      ) {
        throw this.getNotFoundError(path)
      }

      this.logger.error(`Facebook API ${status} on ${path}: ${message}`)
      throw ErrorCode.FB_API_ERROR
    }

    this.logger.error(`Unexpected error on ${path}: ${String(error)}`)
    throw ErrorCode.FB_API_ERROR
  }

  private getErrorMessage(error: unknown): string {
    if (this.isAxiosError(error)) {
      const data = error.response?.data as { error?: { message?: string } } | undefined
      return data?.error?.message ?? error.message ?? 'Unknown API error'
    }
    if (error instanceof Error) {
      return error.message
    }
    return String(error)
  }

  private isAxiosError(error: unknown): error is AxiosError {
    return (error as AxiosError).isAxiosError === true
  }
}
