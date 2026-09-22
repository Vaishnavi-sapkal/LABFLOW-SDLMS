import { HttpService } from '@nestjs/axios';
import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import * as QRCode from 'qrcode';
import { firstValueFrom } from 'rxjs';
import { Invoice, InvoiceDocument, InvoiceItem } from './billing.schema';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
type Booking = { patientId: string; doctorId: string; items: Array<{ testId: string; code: string; name: string; category?: string; price: number }> };
type Patient = { fullName: string; patientId: string }; type Doctor = { fullName: string };
@Injectable()
export class BillingService {
  constructor(@InjectModel(Invoice.name) private readonly invoiceModel: Model<InvoiceDocument>, private readonly http: HttpService, private readonly config: ConfigService) {}
  async create(dto: CreateInvoiceDto) {
    const booking = await this.remote<Booking>('BOOKING_SERVICE_URL', 'bookings', dto.bookingId, 'Booking');
    const [patient, doctor] = await Promise.all([this.remote<Patient>('PATIENT_SERVICE_URL', 'patients', booking.patientId, 'Patient'), this.remote<Doctor>('DOCTOR_SERVICE_URL', 'doctors', booking.doctorId, 'Doctor')]);
    const items: InvoiceItem[] = booking.items.map((item) => ({ testId: item.testId, code: item.code, name: item.name, category: item.category ?? 'Uncategorized', qty: 1, rate: item.price, amount: item.price }));
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0); const totals = this.totals(subtotal, 0);
    for (let attempt = 0; attempt < 2; attempt += 1) { const invoiceNo = await this.nextInvoiceNo(); try { return await this.invoiceModel.create({ invoiceNo, bookingId: dto.bookingId, patientId: booking.patientId, patientName: patient.fullName, patientDisplayId: patient.patientId, doctorId: booking.doctorId, doctorName: doctor.fullName, items, subtotal, ...totals, status: 'draft' }); } catch (error: any) { if (error?.code === 11000 && attempt === 0) continue; if (error?.code === 11000) throw new ConflictException('Could not generate a unique invoice number'); throw error; } }
    throw new ConflictException('Could not generate a unique invoice number');
  }
  findAll(filters?: { patientId?: string; status?: string }) { const query: FilterQuery<InvoiceDocument> = {}; if (filters?.patientId) query.patientId = filters.patientId; if (filters?.status) query.status = filters.status; return this.invoiceModel.find(query).sort({ createdAt: -1 }).exec(); }
  async findOne(id: string) { const invoice = await this.invoiceModel.findById(id).exec(); if (!invoice) throw new NotFoundException(`Invoice ${id} was not found`); return invoice; }
  async findByInvoiceNo(invoiceNo: string) { const invoice = await this.invoiceModel.findOne({ invoiceNo }).exec(); if (!invoice) throw new NotFoundException(`Invoice ${invoiceNo} was not found`); return invoice; }
  async getPaymentQr(id: string) {
    const invoice = await this.findOne(id);
    if (invoice.status === 'paid') throw new BadRequestException('A payment QR cannot be generated for a paid invoice');

    const upiId = this.config.get<string>('UPI_ID');
    if (!upiId) throw new ServiceUnavailableException('UPI_ID is not configured');
    const payeeName = this.config.get<string>('UPI_PAYEE_NAME') ?? 'LabFlow Diagnostics';
    const amountDue = invoice.totalAmount;
    const link = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amountDue}&cu=INR&tn=Invoice-${invoice.invoiceNo}`;
    const qrCode = await QRCode.toDataURL(link, { margin: 1, width: 240 });

    return { invoiceId: invoice.invoiceNo, amountDue, upiId, qrCode };
  }
  async updateDiscount(id: string, discountPercent: number) { const invoice = await this.findDraft(id); Object.assign(invoice, this.totals(invoice.subtotal, discountPercent)); return invoice.save(); }
  async confirmPayment(id: string, dto: ConfirmPaymentDto) { const invoice = await this.findDraft(id); invoice.paymentMethod = dto.paymentMethod; invoice.upiId = dto.upiId; invoice.status = 'paid'; invoice.paidAt = new Date(); return invoice.save(); }
  async cancel(id: string) { const invoice = await this.findOne(id); if (invoice.status !== 'draft') throw new BadRequestException('Only draft invoices can be cancelled'); invoice.status = 'cancelled'; return invoice.save(); }
  async remove(id: string) { const invoice = await this.invoiceModel.findByIdAndDelete(id).exec(); if (!invoice) throw new NotFoundException(`Invoice ${id} was not found`); return { deleted: true, id }; }
  private async findDraft(id: string) { const invoice = await this.findOne(id); if (invoice.status !== 'draft') throw new BadRequestException('Only draft invoices can be updated'); return invoice; }
  private totals(subtotal: number, discountPercent: number) { const discountAmount = subtotal * discountPercent / 100; const gstPercent = 5; const gstAmount = (subtotal - discountAmount) * gstPercent / 100; return { discountPercent, discountAmount, gstPercent, gstAmount, totalAmount: subtotal - discountAmount + gstAmount }; }
  private async remote<T>(key: string, resourcePath: string, id: string, name: string): Promise<T> { const base = this.config.get<string>(key); if (!base) throw new ServiceUnavailableException(`${key} is not configured`); try { return (await firstValueFrom(this.http.get<T>(`${base.replace(/\/$/, '')}/${resourcePath}/${id}`, { headers: this.internalHeaders() }))).data; } catch (error: any) { if (error?.response?.status === 404) throw new NotFoundException(`${name} ${id} was not found`); throw new ServiceUnavailableException(`Unable to retrieve ${name.toLowerCase()} from its service`); } }
  private internalHeaders() { const secret = this.config.get<string>('INTERNAL_SERVICE_SECRET'); if (!secret) throw new ServiceUnavailableException('INTERNAL_SERVICE_SECRET is not configured'); return { 'x-internal-service-key': secret }; }
  // The latest invoice suffix supplies the independent sequential counter; the
  // unique index is the final concurrency guard and creation retries once.
  private async nextInvoiceNo() { const latest = await this.invoiceModel.findOne().sort({ invoiceNo: -1 }).select('invoiceNo').lean().exec(); const n = latest ? Number(latest.invoiceNo.slice(-5)) + 1 : 1; if (n > 99999) throw new ConflictException('Invoice number limit reached'); return `LF-INV-${String(n).padStart(5, '0')}`; }
}
