import { Module } from '@nestjs/common';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { GameGateway } from './game.gateway';

@Module({ controllers: [RoomsController], providers: [RoomsService, GameGateway] })
export class AppModule {}
