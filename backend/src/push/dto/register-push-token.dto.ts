// backend/src/push/dto/register-push-token.dto.ts
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RegisterPushTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  token: string;

  @IsIn(['android', 'ios'])
  platform: 'android' | 'ios';
}
