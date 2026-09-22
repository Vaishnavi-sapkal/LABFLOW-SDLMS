import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdvanceStatusDto } from './dto/advance-status.dto';
import { CreateSampleDto } from './dto/create-sample.dto';
import { SampleService } from './sample.service';
import { Roles, RolesGuard } from './auth';
import { InternalService, InternalServiceGuard } from './internal-service.guard';

@ApiTags('Samples')
@Controller('samples')
@UseGuards(InternalServiceGuard, RolesGuard)
@Roles('admin', 'technician', 'lab_technician')
export class SampleController {
  constructor(private readonly sampleService: SampleService) {}

  @Post()
  @ApiOperation({ summary: 'Create a collected sample after validating its booking' })
  create(@Body() dto: CreateSampleDto) { return this.sampleService.create(dto); }

  @Get()
  @InternalService()
  @ApiOperation({ summary: 'List samples grouped for Kanban columns, optionally filtered by patient' })
  findAll(@Query('patientId') patientId?: string) { return this.sampleService.findAllGrouped(patientId); }

  @Get(':id/qr')
  @InternalService()
  @ApiOperation({ summary: 'Get a printable QR code label for a sample' })
  getQr(@Param('id') id: string) { return this.sampleService.getQrCode(id); }

  @Get(':id')
  @InternalService()
  @ApiOperation({ summary: 'Get a sample by ID' })
  findOne(@Param('id') id: string) { return this.sampleService.findOne(id); }

  @Patch(':id/advance')
  @ApiOperation({ summary: 'Advance a sample to its next workflow stage' })
  advance(@Param('id') id: string, @Body() dto: AdvanceStatusDto) { return this.sampleService.advance(id, dto); }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject a non-terminal sample with a reason' })
  reject(@Param('id') id: string, @Body() dto: AdvanceStatusDto) { return this.sampleService.reject(id, dto); }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a sample by ID' })
  remove(@Param('id') id: string) { return this.sampleService.remove(id); }
}

@ApiTags('Health')
@Controller()
export class HealthController {
  @Get('health')
  @ApiOperation({ summary: 'Check sample service health' })
  health() { return { status: 'ok', service: 'sample' }; }
}
