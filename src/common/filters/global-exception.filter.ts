import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common'
import { Response } from 'express'

interface ExceptionResponse {
  message: string | string[]
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let code: string = 'INTERNAL_SERVER_ERROR'
    let message: string | string[] = 'Internal server error'

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
    }

    response.status(status).json({
      statusCode: status,
      code,
      message,
      timestamp: new Date().toISOString(),
    })
  }
}
