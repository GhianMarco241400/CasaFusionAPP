import { api } from './api';
import { Dish, Entrada, Category } from '../types';

type BackendDish = {
  _id: string;
  name: string;
  price: number;
  categoryId: string;
  image?: string;
};

type BackendEntrada = {
  _id: string;
  name: string;
  price: number;
};

type BackendCategory = {
  _id: string;
  name: string;
  description?: string;
  active: boolean;
};

type DishInput = {
  name: string;
  price: number;
  categoryId: string;
  image?: string;
};

type EntradaInput = {
  name: string;
  price?: number;
};

function normalizarDish(dish: BackendDish): Dish {
  return {
    id: dish._id,
    name: dish.name,
    price: dish.price,
    categoryId: dish.categoryId,
    image: dish.image ?? '',
  };
}

function normalizarEntrada(entrada: BackendEntrada): Entrada {
  return {
    id: entrada._id,
    name: entrada.name,
    price: entrada.price,
  };
}

function normalizarCategory(categoria: BackendCategory): Category {
  return {
    id: categoria._id,
    name: categoria.name,
    description: categoria.description ?? '',
    active: categoria.active,
  };
}

export async function getDishes(): Promise<Dish[]> {
  const response = await api.get('/menu/dishes');
  return response.data.map(normalizarDish);
}

export async function getEntradas(): Promise<Entrada[]> {
  const response = await api.get('/menu/entradas');
  return response.data.map(normalizarEntrada);
}

export async function getCategories(): Promise<Category[]> {
  const response = await api.get('/menu/categories');
  return response.data.map(normalizarCategory);
}

export async function createDish(datos: DishInput): Promise<Dish> {
  const response = await api.post('/menu/dishes', datos);
  return normalizarDish(response.data);
}

export async function updateDish(id: string, datos: Partial<DishInput>): Promise<Dish> {
  const response = await api.patch(`/menu/dishes/${id}`, datos);
  return normalizarDish(response.data);
}

export async function deleteDish(id: string): Promise<void> {
  await api.delete(`/menu/dishes/${id}`);
}

export async function createEntrada(datos: EntradaInput): Promise<Entrada> {
  const response = await api.post('/menu/entradas', datos);
  return normalizarEntrada(response.data);
}

export async function updateEntrada(id: string, datos: Partial<EntradaInput>): Promise<Entrada> {
  const response = await api.patch(`/menu/entradas/${id}`, datos);
  return normalizarEntrada(response.data);
}

export async function deleteEntrada(id: string): Promise<void> {
  await api.delete(`/menu/entradas/${id}`);
}