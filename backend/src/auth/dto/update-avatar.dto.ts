import { IsString, Matches, MaxLength } from 'class-validator';

export class UpdateAvatarDto {
  @IsString()
  @MaxLength(401_000)
  @Matches(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/)
  avatar: string;
}
