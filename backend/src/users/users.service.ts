// backend/src/users/users.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async updateAvatar(
    id: string,
    avatarDataUrl: string,
  ): Promise<UserDocument | null> {
    const base64 = avatarDataUrl.split(',')[1] ?? '';
    const avatar = Buffer.from(base64, 'base64');
    const esJpeg =
      avatar[0] === 0xff && avatar[1] === 0xd8 && avatar[2] === 0xff;

    if (!esJpeg || avatar.length > 300_000) {
      throw new BadRequestException('La imagen del avatar no es válida');
    }

    return this.userModel
      .findOneAndUpdate(
        { _id: id, active: { $ne: false } },
        { $set: { avatar } },
        { returnDocument: 'after', runValidators: true },
      )
      .exec();
  }

  async removeAvatar(id: string): Promise<UserDocument | null> {
    return this.userModel
      .findOneAndUpdate(
        { _id: id, active: { $ne: false } },
        { $unset: { avatar: 1 } },
        { returnDocument: 'after', runValidators: true },
      )
      .exec();
  }

  toPublicUser(user: UserDocument) {
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar
        ? `data:image/jpeg;base64,${user.avatar.toString('base64')}`
        : null,
    };
  }
}
