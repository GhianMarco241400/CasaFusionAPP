import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Correo inválido' })
  email: string;

  @IsString()
  @MinLength(4, { message: 'La contraseña debe tener al menos 4 caracteres' })
  password: string;
}