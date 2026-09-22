import { HttpService } from '@nestjs/axios';
import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, isValidObjectId, Model } from 'mongoose';
import * as QRCode from 'qrcode';
import { firstValueFrom } from 'rxjs';
import { AdvanceStatusDto } from './dto/advance-status.dto';
import { CreateSampleDto } from './dto/create-sample.dto';
import { Sample, SampleDocument, SampleStatus } from './sample.schema';

const NEXT_STATUS: Partial<Record<SampleStatus, SampleStatus>> = {
  collected: 'in-transit',
  'in-transit': 'processing',
  processing: 'completed',
};

@Injectable()
export class SampleService {
  constructor(
    @InjectModel(Sample.name) private readonly sampleModel: Model<SampleDocument>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateSampleDto) {
    await this.validateBooking(dto.bookingId);
    // The monthly suffix is calculated from existing IDs. The unique sampleId index
    // is the final concurrency guard; a duplicate collision is retried once below.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await this.sampleModel.create({ ...dto, sampleId: await this.nextSampleId(), collectedAt: new Date(), status: 'collected', statusUpdatedAt: new Date() });
      } catch (error: any) {
        if (error?.code === 11000 && attempt === 0) continue;
        if (error?.code === 11000) throw new ConflictException('Could not generate a unique sample ID');
        throw error;
      }
    }
  }

  async findAllGrouped(patientId?: string) {
    const filter: FilterQuery<SampleDocument> = patientId ? { patientId } : {};
    const samples = await this.sampleModel.find(filter).sort({ statusUpdatedAt: 1, createdAt: 1 }).exec();
    return {
      collected: samples.filter((sample) => sample.status === 'collected'),
      inTransit: samples.filter((sample) => sample.status === 'in-transit'),
      processing: samples.filter((sample) => sample.status === 'processing'),
      completed: samples.filter((sample) => sample.status === 'completed'),
      rejected: samples.filter((sample) => sample.status === 'rejected'),
    };
  }

  async findOne(id: string) {
    const filter: FilterQuery<SampleDocument> = isValidObjectId(id)
      ? { $or: [{ _id: id }, { sampleId: id }] }
      : { sampleId: id };
    const sample = await this.sampleModel.findOne(filter).exec();
    if (!sample) throw new NotFoundException(`Sample ${id} was not found`);
    return sample;
  }

  async getQrCode(id: string) {
    const sample = await this.findOne(id);
    const qrCode = await QRCode.toDataURL(sample.sampleId, { margin: 1, width: 240 });
    return {
      sampleId: sample.sampleId,
      patientName: sample.patientName,
      testDisplayName: sample.testDisplayName,
      sampleType: sample.sampleType,
      collectedAt: sample.collectedAt,
      qrCode,
    };
  }

  async advance(id: string, dto: AdvanceStatusDto) {
    const sample = await this.findOne(id);
    const nextStatus = NEXT_STATUS[sample.status];
    if (!nextStatus) throw new BadRequestException(`A ${sample.status} sample cannot be advanced`);
    sample.status = nextStatus;
    sample.handledBy = dto.handledBy;
    sample.statusUpdatedAt = new Date();
    return sample.save();
  }

  async reject(id: string, dto: AdvanceStatusDto) {
    if (!dto.rejectionReason) throw new BadRequestException('rejectionReason is required when rejecting a sample');
    const sample = await this.findOne(id);
    if (sample.status === 'completed' || sample.status === 'rejected') {
      throw new BadRequestException(`A ${sample.status} sample cannot be rejected`);
    }
    sample.status = 'rejected';
    sample.handledBy = dto.handledBy;
    sample.rejectionReason = dto.rejectionReason;
    sample.statusUpdatedAt = new Date();
    return sample.save();
  }

  async remove(id: string) {
    const sample = await this.sampleModel.findByIdAndDelete(id).exec();
    if (!sample) throw new NotFoundException(`Sample ${id} was not found`);
    return { deleted: true, id };
  }

  private async validateBooking(bookingId: string): Promise<void> {
    const baseUrl = this.configService.get<string>('BOOKING_SERVICE_URL');
    if (!baseUrl) throw new ServiceUnavailableException('BOOKING_SERVICE_URL is not configured');
    try {
      await firstValueFrom(this.httpService.get(`${baseUrl.replace(/\/$/, '')}/bookings/${bookingId}`, { headers: this.internalHeaders() }));
    } catch (error: any) {
      if (error?.response?.status === 404) throw new NotFoundException(`Booking ${bookingId} was not found`);
      throw new ServiceUnavailableException('Unable to validate booking with booking service');
    }
  }

  private async nextSampleId() {
    const now = new Date();
    const month = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `SMP-${month}-`;
    const latest = await this.sampleModel.findOne({ sampleId: new RegExp(`^${prefix}`) }).sort({ sampleId: -1 }).select('sampleId').lean().exec();
    const sequence = latest ? Number(latest.sampleId.slice(-3)) + 1 : 1;
    if (sequence > 999) throw new ConflictException(`Monthly sample ID limit reached for ${month}`);
    return `${prefix}${String(sequence).padStart(3, '0')}`;
  }

  private internalHeaders() {
    const secret = this.configService.get<string>('INTERNAL_SERVICE_SECRET');
    if (!secret) throw new ServiceUnavailableException('INTERNAL_SERVICE_SECRET is not configured');
    return { 'x-internal-service-key': secret };
  }
}
