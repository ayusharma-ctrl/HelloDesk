import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ZodError } from 'zod';
import { logger } from '../../lib/logger.js';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let errorTitle = 'Internal Server Error';
        let message = 'An unexpected server error occurred';
        let details: string[] | undefined = undefined;

        if (exception instanceof ZodError) {
            status = HttpStatus.BAD_REQUEST;
            errorTitle = 'Validation Error';
            const issueMessages = exception.issues.map(
                (issue) => `${issue.path.join('.') || 'field'}: ${issue.message}`
            );
            message = issueMessages[0] || 'Validation failed';
            details = issueMessages;
        } else if (exception instanceof HttpException) {
            status = exception.getStatus();
            const res: any = exception.getResponse();

            if (typeof res === 'string') {
                message = res;
                errorTitle = exception.name.replace(/Exception$/, '');
            } else if (typeof res === 'object' && res !== null) {
                errorTitle = res.error || exception.name.replace(/Exception$/, '');
                if (Array.isArray(res.message)) {
                    message = res.message[0] || 'Invalid request input';
                    details = res.message;
                } else {
                    message = res.message || exception.message;
                }
            }
        } else if (exception instanceof Error) {
            logger.error({ err: exception, stack: exception.stack }, 'Unhandled Server Exception');
            message = exception.message || 'An unexpected error occurred';
        }

        response.status(status).json({
            statusCode: status,
            error: errorTitle,
            message,
            ...(details ? { details } : {}),
        });
    }
}
