import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientService } from './patient.service';
import { InternalService, InternalServiceGuard, Roles, RolesGuard } from './auth';

@ApiTags('Patients')
@Controller('patients')
@UseGuards(InternalServiceGuard, RolesGuard)
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Post()
  @InternalService()
  @Roles('admin', 'receptionist')
  @ApiOperation({ summary: 'Create a patient profile' })
  create(@Body() createPatientDto: CreatePatientDto) {
    return this.patientService.create(createPatientDto);
  }

  @Get()
  @InternalService()
  @Roles('admin', 'receptionist')
  @ApiOperation({ summary: 'List patient profiles, optionally filtered by name, patient ID, mobile number, or email address' })
  findAll(@Query('search') search?: string) {
    return this.patientService.findAll(search);
  }

  @Get('me')
  @Roles('patient')
  @ApiOperation({ summary: 'Get the authenticated patient profile' })
  findMe(@Req() request: any) {
    return this.patientService.findByUserId(request.user.userId);
  }

  @Get('me/portal')
  @Roles('patient')
  @ApiOperation({ summary: 'Get the authenticated patient portal data' })
  findMyPortal(@Req() request: any) {
    return this.patientService.getPortal(request.user.userId);
  }

  @Delete('by-user/:userId')
  @InternalService()
  @ApiOperation({ summary: 'Delete a patient profile linked to an auth user (internal)' })
  removeByUserId(@Param('userId') userId: string) {
    return this.patientService.removeByUserId(userId);
  }

  @Get(':id/details')
  @Roles('admin', 'receptionist')
  @ApiOperation({ summary: 'Get role-filtered Patient 360 details for an administrator or receptionist' })
  findDetails(@Param('id') id: string, @Req() request: any) {
    return this.patientService.getDetails(id, request.user.role);
  }

  @Get(':id/reports/:reportId')
  @Roles('admin')
  @ApiOperation({ summary: 'Get a Patient 360 report after verifying it belongs to the requested patient' })
  findPatientReport(@Param('id') id: string, @Param('reportId') reportId: string, @Req() request: any) {
    return this.patientService.getPatientReport(id, reportId, request.user.role);
  }

  @Get(':id')
  @InternalService()
  @Roles('admin', 'receptionist', 'doctor', 'patient')
  @ApiOperation({ summary: 'Get a patient profile by ID' })
  async findOne(@Param('id') id: string, @Req() request: any) {
    const patient = await this.patientService.findOne(id);
    if (!request.internalService && request.user?.role === 'patient' && patient.userId !== request.user.userId) {
      throw new ForbiddenException('Patients may only access their own profile');
    }
    return patient;
  }

  @Patch(':id')
  @Roles('admin', 'receptionist')
  @ApiOperation({ summary: 'Update a patient profile by ID' })
  update(@Param('id') id: string, @Body() updatePatientDto: UpdatePatientDto) {
    return this.patientService.update(id, updatePatientDto);
  }

  @Delete(':id')
  @Roles('admin', 'receptionist')
  @ApiOperation({ summary: 'Delete a patient profile by ID' })
  remove(@Param('id') id: string) {
    return this.patientService.remove(id);
  }
}

@ApiTags('Health')
@Controller()
export class HealthController {
  @Get('health')
  @ApiOperation({ summary: 'Check patient service health' })
  health() {
    return { status: 'ok', service: 'patient' };
  }
}
