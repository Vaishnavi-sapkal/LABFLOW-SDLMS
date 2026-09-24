import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { DoctorService } from './doctor.service';
import { Roles, RolesGuard } from './auth';
import { InternalService, InternalServiceGuard } from './internal-service.guard';

@ApiTags('Doctors')
@Controller('doctors')
@UseGuards(InternalServiceGuard, RolesGuard)
@Roles('admin')
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  @Post()
  @ApiOperation({ summary: 'Create a doctor profile' })
  create(@Body() createDoctorDto: CreateDoctorDto) { return this.doctorService.create(createDoctorDto); }

  @Get()
  @InternalService()
  @Roles('admin', 'receptionist', 'patient')
  @ApiOperation({ summary: 'List doctors, optionally filtered by active status or name' })
  findAll(@Query('isActive') isActive?: string, @Query('search') search?: string, @Req() request?: any) {
    return this.doctorService.findAll(request?.user?.role === 'patient' ? 'true' : isActive, search);
  }

  @Get('me')
  @Roles('doctor')
  @ApiOperation({ summary: 'Get the authenticated doctor profile' })
  findMe(@Req() request: any) { return this.doctorService.findByUserId(request.user.userId); }

  @Patch('me')
  @Roles('doctor')
  @ApiOperation({ summary: 'Update the authenticated doctor profile' })
  async updateMe(@Req() request: any, @Body() updateDoctorDto: UpdateDoctorDto) {
    const doctor = await this.doctorService.findByUserId(request.user.userId);
    const { specialization, qualification, registrationNumber, mobile } = updateDoctorDto;
    return this.doctorService.update(String(doctor._id), {
      specialization,
      qualification,
      registrationNumber,
      mobile,
    });
  }

  @Patch('by-user/:userId/deactivate')
  @InternalService()
  @ApiOperation({ summary: 'Deactivate a doctor profile linked to an auth user (internal)' })
  deactivateByUserId(@Param('userId') userId: string) { return this.doctorService.deactivateByUserId(userId); }

  @Get(':id')
  @InternalService()
  @Roles('admin', 'receptionist')
  @ApiOperation({ summary: 'Get a doctor profile by ID' })
  findOne(@Param('id') id: string) { return this.doctorService.findOne(id); }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a doctor profile by ID' })
  update(@Param('id') id: string, @Body() updateDoctorDto: UpdateDoctorDto) {
    return this.doctorService.update(id, updateDoctorDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a doctor profile by deactivating it' })
  remove(@Param('id') id: string) { return this.doctorService.remove(id); }
}

@ApiTags('Health')
@Controller()
export class HealthController {
  @Get('health')
  @ApiOperation({ summary: 'Check doctor service health' })
  health() { return { status: 'ok', service: 'doctor' }; }
}
