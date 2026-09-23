import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateTestDto } from './dto/create-test.dto';
import { UpdateTestDto } from './dto/update-test.dto';
import { TestService } from './test.service';
import { Roles, RolesGuard } from './auth';
import { InternalService, InternalServiceGuard } from './internal-service.guard';

@ApiTags('Tests')
@Controller('tests')
@UseGuards(InternalServiceGuard, RolesGuard)
@Roles('admin')
export class TestController {
  constructor(private readonly testService: TestService) {}

  @Post()
  @ApiOperation({ summary: 'Create a laboratory test or package' })
  create(@Body() createTestDto: CreateTestDto) {
    return this.testService.create(createTestDto);
  }

  @Get()
  @InternalService()
  @Roles('admin', 'receptionist', 'patient')
  @ApiOperation({ summary: 'List tests and packages, optionally filtered by category, package status, name, or code' })
  findAll(
    @Query('category') category?: string,
    @Query('isPackage') isPackage?: string,
    @Query('search') search?: string,
  ) {
    return this.testService.findAll(category, isPackage, search);
  }

  @Get(':id/savings')
  @Roles('admin', 'receptionist')
  @ApiOperation({ summary: 'Calculate the savings for a test package' })
  getSavings(@Param('id') id: string) {
    return this.testService.getSavings(id);
  }

  @Get(':id')
  @InternalService()
  @Roles('admin', 'receptionist')
  @ApiOperation({ summary: 'Get a laboratory test or package by ID' })
  findOne(@Param('id') id: string) {
    return this.testService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a laboratory test or package by ID' })
  update(@Param('id') id: string, @Body() updateTestDto: UpdateTestDto) {
    return this.testService.update(id, updateTestDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a laboratory test or package by ID' })
  remove(@Param('id') id: string) {
    return this.testService.remove(id);
  }
}

@ApiTags('Health')
@Controller()
export class HealthController {
  @Get('health')
  @ApiOperation({ summary: 'Check test service health' })
  health() {
    return { status: 'ok', service: 'test' };
  }
}
