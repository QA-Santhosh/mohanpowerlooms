import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { AppService } from './app.service';
import { FirebaseAuthGuard } from './auth/auth.guard';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('auth/profile')
  @UseGuards(FirebaseAuthGuard)
  getProfile(@Req() req) {
    return req.user;
  }
}
