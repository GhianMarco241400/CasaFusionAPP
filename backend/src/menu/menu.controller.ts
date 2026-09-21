// backend/src/menu/menu.controller.ts
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { MenuService } from './menu.service';
import { CreateDishDto } from './dto/create-dish.dto';
import { UpdateDishDto } from './dto/update-dish.dto';
import { CreateEntradaDto } from './dto/create-entrada.dto';
import { UpdateEntradaDto } from './dto/update-entrada.dto';
import { JwtAuthGuard, JwtUser } from '../auth/guards/jwt-auth.guard';

function verificarAdmin(user: JwtUser) {
  if (user.role !== 'admin') {
    throw new ForbiddenException('Solo el administrador puede gestionar el menú');
  }
}

@Controller('menu')
export class MenuController {
  constructor(private menuService: MenuService) {}

  @Get('dishes')
  getDishes() {
    return this.menuService.findAllDishes();
  }

  @Get('categories')
  getCategories() {
    return this.menuService.findAllCategories();
  }

  @Get('entradas')
  getEntradas() {
    return this.menuService.findAllEntradas();
  }

  @UseGuards(JwtAuthGuard)
  @Post('dishes')
  async createDish(@Request() req: { user: JwtUser }, @Body() dto: CreateDishDto) {
    verificarAdmin(req.user);
    return this.menuService.createDish(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('dishes/:id')
  async updateDish(
    @Request() req: { user: JwtUser },
    @Param('id') id: string,
    @Body() dto: UpdateDishDto,
  ) {
    verificarAdmin(req.user);
    return this.menuService.updateDish(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('dishes/:id')
  async deleteDish(@Request() req: { user: JwtUser }, @Param('id') id: string) {
    verificarAdmin(req.user);
    return this.menuService.softDeleteDish(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('entradas')
  async createEntrada(@Request() req: { user: JwtUser }, @Body() dto: CreateEntradaDto) {
    verificarAdmin(req.user);
    return this.menuService.createEntrada(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('entradas/:id')
  async updateEntrada(
    @Request() req: { user: JwtUser },
    @Param('id') id: string,
    @Body() dto: UpdateEntradaDto,
  ) {
    verificarAdmin(req.user);
    return this.menuService.updateEntrada(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('entradas/:id')
  async deleteEntrada(@Request() req: { user: JwtUser }, @Param('id') id: string) {
    verificarAdmin(req.user);
    return this.menuService.softDeleteEntrada(id);
  }
}