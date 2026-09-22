import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { Roles, RolesGuard } from './auth';
import { InternalService, InternalServiceGuard } from './internal-service.guard';
@ApiTags('Billing') @Controller('billing') @UseGuards(InternalServiceGuard, RolesGuard) @Roles('admin', 'receptionist')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}
  @Post() @ApiOperation({ summary: 'Create a draft invoice from a booking' }) create(@Body() dto: CreateInvoiceDto) { return this.billingService.create(dto); }
  @Get() @InternalService() @ApiOperation({ summary: 'List invoices' }) findAll(@Query('patientId') patientId?: string, @Query('status') status?: string) { return this.billingService.findAll({ patientId, status }); }
  @Get('by-invoice-no/:invoiceNo') @ApiOperation({ summary: 'Get an invoice by number' }) byNo(@Param('invoiceNo') invoiceNo: string) { return this.billingService.findByInvoiceNo(invoiceNo); }
  @Get(':id/payment-qr') @InternalService() @ApiOperation({ summary: 'Get a UPI payment QR code for an unpaid invoice' }) paymentQr(@Param('id') id: string) { return this.billingService.getPaymentQr(id); }
  @Get(':id') @ApiOperation({ summary: 'Get an invoice by ID' }) findOne(@Param('id') id: string) { return this.billingService.findOne(id); }
  @Patch(':id/discount') @ApiOperation({ summary: 'Update a draft invoice discount' }) discount(@Param('id') id: string, @Body() dto: UpdateDiscountDto) { return this.billingService.updateDiscount(id, dto.discountPercent); }
  @Patch(':id/confirm-payment') @ApiOperation({ summary: 'Confirm payment for a draft invoice' }) pay(@Param('id') id: string, @Body() dto: ConfirmPaymentDto) { return this.billingService.confirmPayment(id, dto); }
  @Patch(':id/cancel') @ApiOperation({ summary: 'Cancel a draft invoice' }) cancel(@Param('id') id: string) { return this.billingService.cancel(id); }
  @Delete(':id') @ApiOperation({ summary: 'Delete an invoice' }) remove(@Param('id') id: string) { return this.billingService.remove(id); }
}
@ApiTags('Health') @Controller()
export class HealthController { @Get('health') health() { return { status: 'ok', service: 'billing' }; } }
