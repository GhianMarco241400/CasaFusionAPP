import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(4, 'La contraseña debe tener al menos 4 caracteres'),
});

export type LoginFormData = z.infer<typeof loginSchema>;