import { HttpService } from '@nestjs/axios';
import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { Booking, BookingDocument, BookingItem } from './booking.schema';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreatePatientBookingDto } from './dto/create-patient-booking.dto';
import { BookingStatus } from './dto/update-status.dto';

const TIME_SLOTS = [
  '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM',
];

const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['sample-collected', 'cancelled'],
  'sample-collected': ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

type TestResponse = { _id: string; code: string; name: string; price: number };
type DoctorResponse = { _id: string; isActive: boolean };
type PatientResponse = { _id: string };

@Injectable()
export class BookingService {
  constructor(
    @InjectModel(Booking.name)
    private readonly bookingModel: Model<BookingDocument>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async create(createBookingDto: CreateBookingDto) {
    if (!TIME_SLOTS.includes(createBookingDto.scheduledSlot)) {
      throw new BadRequestException('scheduledSlot is not an available booking slot');
    }

    const scheduledDate = new Date(createBookingDto.scheduledDate);
    const { start, end } = this.dayBounds(scheduledDate);
    const slotTaken = await this.bookingModel.exists({
      doctorId: createBookingDto.doctorId,
      scheduledDate: { $gte: start, $lt: end },
      scheduledSlot: createBookingDto.scheduledSlot,
      status: { $ne: 'cancelled' },
    });
    if (slotTaken) {
      throw new ConflictException('This doctor already has a booking for the selected slot');
    }

    const [items] = await Promise.all([
      this.getTestSnapshots(createBookingDto.testIds),
      this.validateDoctor(createBookingDto.doctorId),
    ]);
    const totalAmount = items.reduce((total, item) => total + item.price, 0);
    const data = {
      patientId: createBookingDto.patientId,
      doctorId: createBookingDto.doctorId,
      items,
      totalAmount,
      scheduledDate,
      scheduledSlot: createBookingDto.scheduledSlot,
      notes: createBookingDto.notes,
    };

    // Retry once if a random LF-BK-##### identifier collides with its unique index.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await this.bookingModel.create(data);
      } catch (error: any) {
        if (error?.code === 11000 && attempt === 0) continue;
        if (error?.code === 11000) throw new ConflictException('Could not generate a unique booking ID');
        throw error;
      }
    }
  }

  async createForPatient(userId: string, dto: CreatePatientBookingDto) {
    const patientId = await this.getPatientIdForUser(userId);
    return this.create({ ...dto, patientId });
  }

  async findForPatient(userId: string) {
    return this.findAll(await this.getPatientIdForUser(userId));
  }

  findAll(patientId?: string, doctorId?: string, status?: string, date?: string) {
    const filter: FilterQuery<BookingDocument> = {};
    if (patientId) filter.patientId = patientId;
    if (doctorId) filter.doctorId = doctorId;
    if (status) filter.status = status;
    if (date) {
      const { start, end } = this.dayBounds(new Date(date));
      filter.scheduledDate = { $gte: start, $lt: end };
    }
    return this.bookingModel.find(filter).sort({ scheduledDate: 1, scheduledSlot: 1 }).exec();
  }

  async findOne(id: string) {
    const booking = await this.bookingModel.findById(id).exec();
    if (!booking) throw new NotFoundException(`Booking ${id} was not found`);
    return booking;
  }

  async updateStatus(id: string, nextStatus: BookingStatus) {
    const booking = await this.findOne(id);
    const currentStatus = booking.status as BookingStatus;
    if (!ALLOWED_TRANSITIONS[currentStatus].includes(nextStatus)) {
      throw new BadRequestException(`Cannot transition a ${currentStatus} booking to ${nextStatus}`);
    }
    booking.status = nextStatus;
    return booking.save();
  }

  async remove(id: string) {
    const booking = await this.bookingModel.findByIdAndDelete(id).exec();
    if (!booking) throw new NotFoundException(`Booking ${id} was not found`);
    return { deleted: true, id };
  }

  async getAvailability(doctorId: string, date: string) {
    if (!doctorId || !date) throw new BadRequestException('doctorId and date are required');
    const { start, end } = this.dayBounds(new Date(date));
    const bookings = await this.bookingModel
      .find({ doctorId, scheduledDate: { $gte: start, $lt: end }, status: { $ne: 'cancelled' } })
      .select('scheduledSlot')
      .exec();
    const bookedSlots = new Set(bookings.map((booking) => booking.scheduledSlot));
    return TIME_SLOTS.map((slot) => ({ slot, available: !bookedSlots.has(slot) }));
  }

  async getPendingCounts() {
    return this.bookingModel.aggregate([
      { $match: { status: 'pending' } },
      { $group: { _id: '$doctorId', pendingCount: { $sum: 1 } } },
      { $project: { _id: 0, doctorId: '$_id', pendingCount: 1 } },
      { $sort: { doctorId: 1 } },
    ]);
  }

  private async getTestSnapshots(testIds: string[]): Promise<BookingItem[]> {
    const testServiceUrl = this.configService.get<string>('TEST_SERVICE_URL');
    if (!testServiceUrl) throw new ServiceUnavailableException('TEST_SERVICE_URL is not configured');

    const testResults = await Promise.all(testIds.map(async (testId) => {
      try {
        const response = await firstValueFrom(this.httpService.get<TestResponse>(`${testServiceUrl.replace(/\/$/, '')}/tests/${testId}`, { headers: this.internalHeaders() }));
        return response.data;
      } catch {
        throw new NotFoundException(`Test ${testId} was not found in test service`);
      }
    }));

    return testResults.map((test) => ({
      testId: test._id,
      code: test.code,
      name: test.name,
      price: test.price,
    }));
  }

  private async validateDoctor(doctorId: string): Promise<void> {
    const doctorServiceUrl = this.configService.get<string>('DOCTOR_SERVICE_URL');
    if (!doctorServiceUrl) throw new ServiceUnavailableException('DOCTOR_SERVICE_URL is not configured');

    try {
      const response = await firstValueFrom(
        this.httpService.get<DoctorResponse>(`${doctorServiceUrl.replace(/\/$/, '')}/doctors/${doctorId}`, { headers: this.internalHeaders() }),
      );
      if (!response.data.isActive) {
        throw new BadRequestException(`Doctor ${doctorId} is inactive and cannot receive bookings`);
      }
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      if (error?.response?.status === 404) {
        throw new NotFoundException(`Doctor ${doctorId} was not found in doctor service`);
      }
      throw new ServiceUnavailableException('Unable to validate doctor with doctor service');
    }
  }

  private async getPatientIdForUser(userId: string): Promise<string> {
    const patientServiceUrl = this.configService.get<string>('PATIENT_SERVICE_URL');
    if (!patientServiceUrl) throw new ServiceUnavailableException('PATIENT_SERVICE_URL is not configured');
    try {
      const response = await firstValueFrom(
        this.httpService.get<PatientResponse>(`${patientServiceUrl.replace(/\/$/, '')}/patients/by-user/${encodeURIComponent(userId)}`, { headers: this.internalHeaders() }),
      );
      return response.data._id;
    } catch (error: any) {
      if (error?.response?.status === 404) throw new NotFoundException('No patient profile is linked to this account');
      throw new ServiceUnavailableException('Unable to resolve the authenticated patient profile');
    }
  }

  private dayBounds(date: Date) {
    if (Number.isNaN(date.getTime())) throw new BadRequestException('date must be a valid ISO 8601 date');
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

  private internalHeaders() {
    const secret = this.configService.get<string>('INTERNAL_SERVICE_SECRET');
    if (!secret) throw new ServiceUnavailableException('INTERNAL_SERVICE_SECRET is not configured');
    return { 'x-internal-service-key': secret };
  }
}
