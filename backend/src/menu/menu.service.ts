import { Injectable, NotFoundException } from '@nestjs/common';
import { OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Dish, DishDocument } from './schemas/dish.schema';
import { Category, CategoryDocument } from './schemas/category.schema';
import { Entrada, EntradaDocument } from './schemas/entrada.schema';
import { CreateDishDto } from './dto/create-dish.dto';
import { UpdateDishDto } from './dto/update-dish.dto';
import { CreateEntradaDto } from './dto/create-entrada.dto';
import { UpdateEntradaDto } from './dto/update-entrada.dto';

@Injectable()
export class MenuService implements OnModuleInit {
  constructor(
    @InjectModel(Dish.name) private dishModel: Model<DishDocument>,
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(Entrada.name) private entradaModel: Model<EntradaDocument>,
  ) {}

  async onModuleInit() {
    const categoriasIniciales = [
      { name: 'Entradas', description: 'Platos de entrada' },
      { name: 'Fondos', description: 'Platos principales' },
      { name: 'Extras', description: 'Platos y gaseosas extras' },
      { name: 'Especiales', description: 'Platos especiales' },
    ];
    for (const cat of categoriasIniciales) {
      await this.categoryModel.updateOne(
        { name: cat.name },
        { $set: { ...cat, active: true } },
        { upsert: true },
      );
    }
  }

  async findAllDishes() {
    return this.dishModel.find({ active: { $ne: false } }).exec();
  }

  async findAllCategories() {
    return this.categoryModel.find({ active: true }).exec();
  }

  async findAllEntradas() {
    return this.entradaModel.find({ active: { $ne: false } }).exec();
  }

  async createDish(dto: CreateDishDto) {
    const categoría = await this.categoryModel.findById(dto.categoryId);
    if (!categoría) {
      throw new NotFoundException('Categoría no encontrada');
    }
    return this.dishModel.create({
      ...dto,
      categoryId: new Types.ObjectId(dto.categoryId),
      active: true,
    });
  }

  async updateDish(id: string, dto: UpdateDishDto) {
    const categoríaValida = !dto.categoryId || (await this.categoryModel.findById(dto.categoryId));
    if (!categoríaValida) {
      throw new NotFoundException('Categoría no encontrada');
    }
    const actualizado = await this.dishModel
      .findOneAndUpdate({ _id: id, active: { $ne: false } }, dto, { returnDocument: 'after' })
      .exec();
    if (!actualizado) {
      throw new NotFoundException('Plato no encontrado');
    }
    return actualizado;
  }

  async softDeleteDish(id: string) {
    const eliminado = await this.dishModel
      .findOneAndUpdate({ _id: id, active: { $ne: false } }, { active: false }, { returnDocument: 'after' })
      .exec();
    if (!eliminado) {
      throw new NotFoundException('Plato no encontrado');
    }
    return eliminado;
  }

  async createEntrada(dto: CreateEntradaDto) {
    return this.entradaModel.create({ name: dto.name, price: 0, active: true });
  }

  async updateEntrada(id: string, dto: UpdateEntradaDto) {
    const actualizado = await this.entradaModel
      .findOneAndUpdate(
        { _id: id, active: { $ne: false } },
        { name: dto.name, price: 0 },
        { returnDocument: 'after' }
      )
      .exec();
    if (!actualizado) {
      throw new NotFoundException('Entrada no encontrada');
    }
    return actualizado;
  }

  async softDeleteEntrada(id: string) {
    const eliminado = await this.entradaModel
      .findOneAndUpdate({ _id: id, active: { $ne: false } }, { active: false }, { returnDocument: 'after' })
      .exec();
    if (!eliminado) {
      throw new NotFoundException('Entrada no encontrada');
    }
    return eliminado;
  }
}