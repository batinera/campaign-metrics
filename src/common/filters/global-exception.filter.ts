import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { GqlContextType } from '@nestjs/graphql'
import { GraphQLError } from 'graphql'
import { Response } from 'express'
import { AxiosError } from 'axios'

interface ExceptionResponse {
  message: string | string[]
}

function resolveException(exception: unknown): HttpException | null {
  if (exception instanceof HttpException) return exception
  const err = exception as Record<string, unknown>
  const nested = err?.cause ?? err?.originalError ?? err?.original
  if (nested instanceof HttpException) return nested
  if (nested && typeof nested === 'object') return resolveException(nested) as HttpException | null
  return null
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let code: string = 'INTERNAL_SERVER_ERROR'
    let message: string | string[] = 'Internal server error'

    const httpEx = resolveException(exception)
    if (httpEx) {
      exception = httpEx
    }

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const res = exception.getResponse() as ExceptionResponse | string

      if (typeof res === 'object') {
        if (Array.isArray(res.message)) {
          code = 'VALIDATION_ERROR'
          message = res.message[0]
        } else {
          code = res.message
          message = res.message
        }
      } else {
        code = res
        message = res
      }
    } else if (exception instanceof Error) {
      if (exception.name === 'JsonWebTokenError' || exception.name === 'TokenExpiredError') {
        status = HttpStatus.UNAUTHORIZED
        code = 'UNAUTHORIZED'
        message = exception.message ?? 'Invalid or expired token'
      } else if (exception.name === 'AxiosError' || (exception as AxiosError).isAxiosError) {
        const axiosErr = exception as AxiosError
        const apiStatus = axiosErr.response?.status
        status =
          apiStatus && apiStatus >= 400 && apiStatus < 600 ? apiStatus : HttpStatus.BAD_GATEWAY
        code = 'FB_API_ERROR'
        const data = axiosErr.response?.data as { error?: { message?: string } } | undefined
        message =
          (typeof data?.error?.message === 'string' ? data.error.message : null) ??
          axiosErr.message ??
          'External API error'
      } else {
        this.logger.error(`Unhandled ${exception.name}: ${exception.message}`, exception.stack)
      }
    }

    // GraphQL or non-Express context: don't use response object, let framework format
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const isGraphql = host.getType<GqlContextType>() === 'graphql'
    const hasStatus = typeof response?.status === 'function'

    if (isGraphql || !hasStatus) {
      const graphqlCode = this.mapStatusToGraphQLCode(status)
      throw new GraphQLError(message, {
        extensions: {
          code: graphqlCode,
          statusCode: status,
          errorCode: code,
          timestamp: new Date().toISOString(),
        },
      })
    }

    response.status(status).json({
      statusCode: status,
      code,
      message,
      timestamp: new Date().toISOString(),
    })
  }

  private mapStatusToGraphQLCode(status: number): string {
    switch (status) {
      case 400:
        return 'BAD_REQUEST'
      case 401:
        return 'UNAUTHENTICATED'
      case 403:
        return 'FORBIDDEN'
      case 404:
        return 'NOT_FOUND'
      case 500:
        return 'INTERNAL_SERVER_ERROR'
      case 502:
        return 'BAD_GATEWAY'
      default:
        return 'INTERNAL_SERVER_ERROR'
    }
  }
}
