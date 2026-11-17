// backend/src/push/dto/unregister-push-token.dto.ts
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UnregisterPushTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  token: string;
}
