import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, body } = request;

    // We only log modifying requests (POST, PUT, PATCH, DELETE)
    const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    if (!isWrite || url.includes('/auth') || url.includes('/login')) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (responseData) => {
        try {
          const userId = user?.id || null;
          let action = `${method} ${url}`;
          let moduleName = 'System';

          // Derive module from URL
          if (url.includes('/workers')) {
            moduleName = 'Worker Management';
            action = method === 'POST' ? 'Worker Created' : method === 'DELETE' ? 'Worker Deleted' : 'Worker Updated';
          } else if (url.includes('/warps')) {
            moduleName = 'Warp Yarn Management';
            action = method === 'POST' ? 'Warp Created' : method === 'DELETE' ? 'Warp Deleted' : 'Warp Updated';
          } else if (url.includes('/production')) {
            moduleName = 'Saree Production';
            action = method === 'POST' ? 'Production Logged' : method === 'DELETE' ? 'Production Deleted' : 'Production Updated';
          } else if (url.includes('/salary') || url.includes('/payments')) {
            moduleName = 'Salary & Banking';
            action = method === 'POST' ? 'Payment Recorded' : 'Salary Configuration Updated';
          }

          // Format new value
          const newValueString = body ? JSON.stringify(body) : null;
          const oldValueString = responseData && responseData.oldValue ? JSON.stringify(responseData.oldValue) : null;

          await this.prisma.auditLog.create({
            data: {
              userId,
              action,
              module: moduleName,
              oldValue: oldValueString,
              newValue: newValueString,
            },
          });
        } catch (error) {
          console.error('Failed to write audit log:', error);
        }
      })
    );
  }
}
