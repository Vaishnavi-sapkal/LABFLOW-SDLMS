import { ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { Patient, PatientDocument } from './patient.schema';

@Injectable()
export class PatientService {
  constructor(
    @InjectModel(Patient.name)
    private readonly patientModel: Model<PatientDocument>,
    private readonly configService: ConfigService,
  ) {}

  async create(createPatientDto: CreatePatientDto) {
    // Retry once on the very unlikely random patient-ID unique-index collision.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await this.patientModel.create(createPatientDto);
      } catch (error: any) {
        if (error?.code !== 11000 || attempt === 1) {
          if (error?.code === 11000) {
            if (error?.keyPattern?.mobile) {
              throw new ConflictException('A patient with this mobile number already exists');
            }
            throw new ConflictException('Could not generate a unique patient ID');
          }
          throw error;
        }
      }
    }
  }

  async findAll(search?: string) {
    const filter = search
      ? {
          $or: [
            { fullName: { $regex: this.escapeRegex(search), $options: 'i' } },
            { patientId: { $regex: this.escapeRegex(search), $options: 'i' } },
            { mobile: { $regex: this.escapeRegex(search), $options: 'i' } },
          ],
        }
      : {};

    return this.patientModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string) {
    const patient = await this.patientModel.findById(id).exec();
    if (!patient) {
      throw new NotFoundException(`Patient ${id} was not found`);
    }
    return patient;
  }

  async findByUserId(userId: string) {
    const patient = await this.patientModel.findOne({ userId }).exec();
    if (!patient) throw new NotFoundException('No patient profile is linked to this account');
    return patient;
  }

  async getPortal(userId: string) {
    const patient = await this.findByUserId(userId);
    const headers = this.internalHeaders();
    const patientId = String(patient._id);
    const load = async (key: string, path: string) => {
      const base = this.configService.get<string>(key);
      if (!base) throw new ServiceUnavailableException(`${key} is not configured`);
      const response = await fetch(`${base.replace(/\/$/, '')}${path}`, { headers });
      if (!response.ok) throw new ServiceUnavailableException(`Unable to load patient portal data (${response.status})`);
      return response.json();
    };
    const [bookings, reports, invoices] = await Promise.all([
      load('BOOKING_SERVICE_URL', `/bookings?patientId=${encodeURIComponent(patientId)}`),
      load('REPORT_SERVICE_URL', `/reports?patientId=${encodeURIComponent(patientId)}`),
      load('BILLING_SERVICE_URL', `/billing?patientId=${encodeURIComponent(patientId)}`),
    ]);
    return { patient, bookings, reports, invoices };
  }

  private internalHeaders() {
    const secret = this.configService.get<string>('INTERNAL_SERVICE_SECRET');
    if (!secret) throw new ServiceUnavailableException('INTERNAL_SERVICE_SECRET is not configured');
    return { 'x-internal-service-key': secret };
  }

  async update(id: string, updatePatientDto: UpdatePatientDto) {
    const patient = await this.patientModel
      .findByIdAndUpdate(id, updatePatientDto, { new: true, runValidators: true })
      .exec();
    if (!patient) {
      throw new NotFoundException(`Patient ${id} was not found`);
    }
    return patient;
  }

  async remove(id: string) {
    const patient = await this.patientModel.findByIdAndDelete(id).exec();
    if (!patient) {
      throw new NotFoundException(`Patient ${id} was not found`);
    }
    return { deleted: true, id };
  }

  async removeByUserId(userId: string) {
    const result = await this.patientModel.deleteMany({ userId }).exec();
    return { deleted: result.deletedCount > 0, deletedCount: result.deletedCount };
  }

  private escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
