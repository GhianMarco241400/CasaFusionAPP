// backend/src/reports/reports.controller.ts
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard, JwtUser } from '../auth/guards/jwt-auth.guard';

class CompletePagoDto {
  @IsIn(['YAPE', 'EFECTIVO'])
  metodoPago: 'YAPE' | 'EFECTIVO';
}

class CompleteDeliveryDto {
  @IsIn(['PAGADO', 'PENDIENTE'])
  pagoEstado: 'PAGADO' | 'PENDIENTE';

  @IsOptional()
  @IsIn(['YAPE', 'EFECTIVO'])
  metodoPago?: 'YAPE' | 'EFECTIVO';
}

class RegistroManualDto {
  @IsIn(['FIADO', 'INGRESO'])
  tipo: 'FIADO' | 'INGRESO';

  @IsIn(['mesa', 'delivery'])
  canal: 'mesa' | 'delivery';

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  monto: number;

  @IsOptional()
  @IsIn(['YAPE', 'EFECTIVO'])
  metodoPago?: 'YAPE' | 'EFECTIVO';

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  concepto?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  clienteNombre?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;
}

class ErrorAvisoDto {
  @IsString()
  @IsNotEmpty()
  desc: string;
}

class ReabrirCobroDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  motivo: string;

  @IsOptional()
  @IsIn(['READY', 'IN_PREPARATION'])
  destino?: 'READY' | 'IN_PREPARATION';
}

function verificarRol(user: JwtUser, rolesPermitidos: string[]) {
  if (!rolesPermitidos.includes(user.role)) {
    throw new ForbiddenException('No tienes permisos para esta acción');
  }
}

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Post('complete-table/:tableNumber')
  async completeTable(
    @Request() req: { user: JwtUser },
    @Param('tableNumber', ParseIntPipe) tableNumber: number,
    @Body() dto: CompletePagoDto,
  ) {
    verificarRol(req.user, ['mesero', 'admin']);
    return this.reportsService.completeTable(tableNumber, dto.metodoPago);
  }

  @Post('complete-order/:orderId')
  async completeOrder(
    @Request() req: { user: JwtUser },
    @Param('orderId') orderId: string,
    @Body() dto: CompletePagoDto,
  ) {
    verificarRol(req.user, ['mesero', 'admin']);
    return this.reportsService.completeOrder(orderId, dto.metodoPago);
  }

  @Post('complete-delivery/:orderId')
  async completeDelivery(
    @Request() req: { user: JwtUser },
    @Param('orderId') orderId: string,
    @Body() dto: CompleteDeliveryDto,
  ) {
    verificarRol(req.user, ['delivery', 'admin']);
    return this.reportsService.completeOrderDelivery(
      orderId,
      dto.pagoEstado,
      dto.metodoPago,
    );
  }

  @Post('reabrir-cobro/:orderId')
  async reabrirCobro(
    @Request() req: { user: JwtUser },
    @Param('orderId') orderId: string,
    @Body() dto: ReabrirCobroDto,
  ) {
    verificarRol(req.user, ['mesero', 'delivery', 'admin']);
    return this.reportsService.reabrirCobro(
      orderId,
      dto.motivo.trim(),
      dto.destino ?? 'READY',
      req.user.userId,
    );
  }

  @Get()
  async getToday(@Request() req: { user: JwtUser }) {
    verificarRol(req.user, ['admin']);
    return this.reportsService.getByDate(this.reportsService.claveHoy());
  }

  @Get('week')
  async getWeek(@Request() req: { user: JwtUser }) {
    verificarRol(req.user, ['admin']);
    return this.reportsService.sumarioSemana();
  }

  @Post('fiado/:orderId/cobrar')
  async cobrarFiado(
    @Request() req: { user: JwtUser },
    @Param('orderId') orderId: string,
    @Body() dto: CompletePagoDto,
  ) {
    verificarRol(req.user, ['admin']);
    return this.reportsService.cobrarFiado(orderId, dto.metodoPago);
  }

  @Post('fiado/:orderId/revertir-cobro')
  async revertirCobroFiado(
    @Request() req: { user: JwtUser },
    @Param('orderId') orderId: string,
  ) {
    verificarRol(req.user, ['admin']);
    return this.reportsService.revertirCobroFiado(orderId, req.user.userId);
  }

  @Post('registro-manual')
  async registroManual(
    @Request() req: { user: JwtUser },
    @Body() dto: RegistroManualDto,
  ) {
    verificarRol(req.user, ['admin']);
    return this.reportsService.registroManual({
      ...dto,
      creadoPor: req.user.userId,
    });
  }

  @Post('cuaderno/:id/cobrar-fiado-manual')
  async cobrarFiadoManual(
    @Request() req: { user: JwtUser },
    @Param('id') id: string,
    @Body() dto: CompletePagoDto,
  ) {
    verificarRol(req.user, ['admin']);
    return this.reportsService.cobrarFiadoManual(id, dto.metodoPago);
  }

  @Post('cuaderno/:id/revertir-cobro-manual')
  async revertirCobroFiadoManual(
    @Request() req: { user: JwtUser },
    @Param('id') id: string,
  ) {
    verificarRol(req.user, ['admin']);
    return this.reportsService.revertirCobroFiadoManual(id);
  }

  @Get('cuaderno')
  async getCuaderno(@Request() req: { user: JwtUser }) {
    verificarRol(req.user, ['admin']);
    return this.reportsService.getCuaderno();
  }

  @Get('avisos')
  async getAvisos(@Request() req: { user: JwtUser }) {
    verificarRol(req.user, ['admin']);
    return this.reportsService.getAvisos();
  }

  @Post('avisos/leer')
  async marcarAvisos(@Request() req: { user: JwtUser }) {
    verificarRol(req.user, ['admin']);
    return this.reportsService.marcarAvisosLeidos();
  }

  @Post('avisos/error')
  async reportarError(
    @Request() req: { user: JwtUser },
    @Body() dto: ErrorAvisoDto,
  ) {
    verificarRol(req.user, ['admin', 'mesero', 'cocina', 'delivery']);
    return this.reportsService.reportarError(dto.desc);
  }

  @Delete('avisos/:id')
  async eliminarAviso(
    @Request() req: { user: JwtUser },
    @Param('id') id: string,
  ) {
    verificarRol(req.user, ['admin']);
    return this.reportsService.eliminarAviso(id);
  }

  @Delete('venta/:orderId')
  async eliminarVenta(
    @Request() req: { user: JwtUser },
    @Param('orderId') orderId: string,
  ) {
    verificarRol(req.user, ['admin']);
    return this.reportsService.eliminarComanda(orderId, req.user.userId);
  }

  @Delete('ingreso-manual/:date/:indice')
  async eliminarIngresoManual(
    @Request() req: { user: JwtUser },
    @Param('date') date: string,
    @Param('indice') indice: string,
  ) {
    verificarRol(req.user, ['admin']);
    return this.reportsService.eliminarIngresoManual(
      date,
      Number(indice),
      req.user.userId,
    );
  }

  @Delete('cuaderno/:id')
  async eliminarFiado(
    @Request() req: { user: JwtUser },
    @Param('id') id: string,
  ) {
    verificarRol(req.user, ['admin']);
    return this.reportsService.eliminarFiado(id);
  }

  @Get('mis-comandas')
  async getMisComandas(@Request() req: { user: JwtUser }) {
    verificarRol(req.user, ['mesero', 'delivery', 'admin']);
    return this.reportsService.getMisComandas(
      req.user.userId,
      req.user.role === 'admin',
    );
  }

  @Get(':date')
  async getReport(
    @Request() req: { user: JwtUser },
    @Param('date') date: string,
  ) {
    verificarRol(req.user, ['admin']);
    return this.reportsService.getByDate(date);
  }

  @Get('export/:date')
  async exportarXlsx(
    @Request() req: { user: JwtUser },
    @Param('date') date: string,
    @Res() res: Response,
  ) {
    verificarRol(req.user, ['admin']);
    const { buffer, filename } = await this.reportsService.exportarXlsx(date);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.byteLength);
    res.send(buffer);
  }
}
