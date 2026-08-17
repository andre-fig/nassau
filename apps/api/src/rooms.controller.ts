import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';

class GuestDto { @ApiProperty() @IsString() @MinLength(1) displayName!: string; @ApiProperty() @IsString() @MinLength(10) guestPublicId!: string; }
class ReconnectDto { @ApiProperty() @IsString() reconnectToken!: string; }
class ActionDto { @ApiProperty() action!: Record<string, unknown>; }

@Controller('rooms')
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}
  @Post() create(@Body() body: GuestDto) { return this.rooms.create(body.displayName, body.guestPublicId); }
  @Post(':code/join') join(@Param('code') code: string, @Body() body: GuestDto) { return this.rooms.join(code, body.displayName, body.guestPublicId); }
  @Post(':code/reconnect') reconnect(@Param('code') code: string, @Body() body: ReconnectDto) { return this.rooms.reconnect(code, body.reconnectToken); }
  @Get(':code') get(@Param('code') code: string) { return this.rooms.get(code); }
  @Post(':code/action') action(@Param('code') code: string, @Body() body: ActionDto) { return this.rooms.action(code, body.action as never); }
}
