import { Body, Controller, Delete, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateReportDto } from './dto/create-report.dto';
import { ReportService } from './report.service';
import { Public, Roles, RolesGuard } from './auth';
import { InternalService, InternalServiceGuard } from './internal-service.guard';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(InternalServiceGuard, RolesGuard)
@Roles('admin', 'doctor', 'technician', 'lab_technician')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  @InternalService()
  @Roles('admin', 'doctor')
  @ApiOperation({ summary: 'Generate an immutable report from an approved verification' })
  @ApiBody({ type: CreateReportDto })
  create(@Body() dto: CreateReportDto) { return this.reportService.create(dto); }

  @Get()
  @InternalService()
  @ApiOperation({ summary: 'List reports, optionally filtered by patient or doctor' })
  findAll(@Query('patientId') patientId?: string, @Query('doctorId') doctorId?: string) {
    return this.reportService.findAll({ patientId, doctorId });
  }

  @Get('by-report-no/:reportNo')
  @ApiOperation({ summary: 'Get a report by report number' })
  findByReportNo(@Param('reportNo') reportNo: string) { return this.reportService.findByReportNo(reportNo); }

  @Get('verify/:reportNo')
  @Public()
  @ApiOperation({ summary: 'Publicly verify a report number' })
  async verify(@Param('reportNo') reportNo: string, @Res({ passthrough: true }) response: any) {
    const report = await this.reportService.verify(reportNo);
    if (!report) response.status(404);
    return report ?? { valid: false };
  }

  @Get(':id')
  @InternalService()
  @ApiOperation({ summary: 'Get a report by ID' })
  findOne(@Param('id') id: string) { return this.reportService.findOne(id); }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a report by ID' })
  remove(@Param('id') id: string) { return this.reportService.remove(id); }
}

@ApiTags('Health')
@Controller()
export class HealthController {
  @Get('health')
  @ApiOperation({ summary: 'Check report service health' })
  health() { return { status: 'ok', service: 'report' }; }
}
