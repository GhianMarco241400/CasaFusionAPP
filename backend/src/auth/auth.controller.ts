// backend/src/auth/auth.controller.ts
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { JwtUser } from './guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() request: Request) {
    const { userId } = (request as Request & { user: JwtUser }).user;
    const user = await this.usersService.findById(userId);

    if (!user || user.active === false) {
      throw new UnauthorizedException('Sesión inválida');
    }

    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }
}