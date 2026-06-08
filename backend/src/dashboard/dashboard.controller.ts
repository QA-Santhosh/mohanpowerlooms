import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { FirebaseAuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@Controller('dashboard')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  getStats(@Req() req) {
    const user = req.user;
    const workerProfileId = user.workerProfile?.id;
    return this.dashboardService.getStats(user.role, workerProfileId);
  }

  @Get('charts')
  getCharts(@Req() req) {
    const user = req.user;
    const workerProfileId = user.workerProfile?.id;
    return this.dashboardService.getCharts(user.role, workerProfileId);
  }

  @Get('recent')
  getRecent(@Req() req) {
    const user = req.user;
    const workerProfileId = user.workerProfile?.id;
    return this.dashboardService.getRecentActivities(user.role, workerProfileId);
  }
}
