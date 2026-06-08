import { Controller, Get, Param, Put, UseGuards, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { FirebaseAuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@Controller('notifications')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@Req() req) {
    const userId = req.user.id;
    return this.notificationsService.findForUser(userId);
  }

  @Put('read-all')
  markAllAsRead(@Req() req) {
    const userId = req.user.id;
    return this.notificationsService.markAllAsRead(userId);
  }

  @Put(':id/read')
  markAsRead(@Param('id') id: string, @Req() req) {
    const userId = req.user.id;
    return this.notificationsService.markAsRead(id, userId);
  }
}
