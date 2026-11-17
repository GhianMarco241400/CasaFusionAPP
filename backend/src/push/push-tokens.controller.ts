// backend/src/push/push-tokens.controller.ts
import {
  Body,
  Controller,
  Delete,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, JwtUser } from '../auth/guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { UnregisterPushTokenDto } from './dto/unregister-push-token.dto';

@Controller('push-tokens')
@UseGuards(JwtAuthGuard)
export class PushTokensController {
  constructor(private usersService: UsersService) {}

  @Post()
  async register(
    @Request() req: { user: JwtUser },
    @Body() dto: RegisterPushTokenDto,
  ) {
    await this.usersService.addPushToken(req.user.userId, dto.token);
    return { ok: true };
  }

  @Delete()
  async unregister(
    @Request() req: { user: JwtUser },
    @Body() dto: UnregisterPushTokenDto,
  ) {
    await this.usersService.removePushToken(req.user.userId, dto.token);
    return { ok: true };
  }
}
