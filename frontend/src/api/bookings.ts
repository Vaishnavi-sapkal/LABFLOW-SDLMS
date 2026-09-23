import { isAxiosError } from 'axios';
import client from './client';

export interface CreateBookingDto {
  patientId: string;
  doctorId: string;
  testIds: string[];
  scheduledDate: string;
  scheduledSlot: string;
  notes?: string;
}

export type CreatePatientBookingDto = Omit<CreateBookingDto, 'patientId'>;

export interface BookingItem {
  testId: string;
  code: string;
  name: string;
  price: number;
}

export interface CreatedBooking {
  _id?: string;
  bookingId: string;
  patientId: string;
  doctorId: string;
  items: BookingItem[];
  totalAmount: number;
  scheduledDate: string;
  scheduledSlot: string;
  status: string;
  notes?: string;
}

export interface SlotAvailability {
  slot: string;
  available: boolean;
}

export interface DoctorPendingCount {
  doctorId: string;
  pendingCount: number;
}

export class BookingRequestError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'BookingRequestError';
  }
}

export async function createBooking(payload: CreateBookingDto): Promise<CreatedBooking> {
  try {
    const { data } = await client.post<CreatedBooking>('/bookings', payload);
    return data;
  } catch (error) {
    if (isAxiosError(error)) {
      const message = error.response?.data?.message;
      throw new BookingRequestError(
        typeof message === 'string' ? message : 'Unable to create booking. Please try again.',
        error.response?.status,
      );
    }

    throw error;
  }
}

export async function createMyBooking(payload: CreatePatientBookingDto): Promise<CreatedBooking> {
  try {
    const { data } = await client.post<CreatedBooking>('/bookings/me', payload);
    return data;
  } catch (error) {
    if (isAxiosError(error)) {
      const message = error.response?.data?.message;
      throw new BookingRequestError(typeof message === 'string' ? message : 'Unable to create your booking. Please try again.', error.response?.status);
    }
    throw error;
  }
}

export async function listMyBookings(): Promise<CreatedBooking[]> {
  try { return (await client.get<CreatedBooking[]>('/bookings/me')).data; }
  catch (error) { if (isAxiosError(error)) throw new Error(typeof error.response?.data?.message === 'string' ? error.response.data.message : 'Unable to load your bookings.'); throw error; }
}

export async function listBookings(filters?: { patientId?: string; doctorId?: string; status?: string; date?: string }): Promise<CreatedBooking[]> {
  try {
    const { data } = await client.get<CreatedBooking[]>('/bookings', { params: filters });
    return data;
  } catch (error) {
    if (isAxiosError(error)) {
      const message = error.response?.data?.message;
      throw new Error(typeof message === 'string' ? message : 'Unable to load bookings. Please try again.');
    }

    throw error;
  }
}

export async function getBooking(id: string): Promise<CreatedBooking> {
  try {
    const { data } = await client.get<CreatedBooking>(`/bookings/${id}`);
    return data;
  } catch (error) {
    if (isAxiosError(error)) {
      const message = error.response?.data?.message;
      throw new Error(typeof message === 'string' ? message : 'Unable to load booking details. Please try again.');
    }

    throw error;
  }
}

export async function getAvailability(date: string, doctorId: string): Promise<SlotAvailability[]> {
  try {
    const { data } = await client.get<SlotAvailability[]>('/bookings/availability', { params: { date, doctorId } });
    return data;
  } catch (error) {
    if (isAxiosError(error)) {
      const message = error.response?.data?.message;
      throw new Error(typeof message === 'string' ? message : 'Unable to load slot availability. Please try again.');
    }

    throw error;
  }
}

export async function getPendingCounts(): Promise<DoctorPendingCount[]> {
  try {
    const { data } = await client.get<DoctorPendingCount[]>('/bookings/doctors/pending-counts');
    return data;
  } catch (error) {
    if (isAxiosError(error)) {
      const message = error.response?.data?.message;
      throw new Error(typeof message === 'string' ? message : 'Unable to load doctor pending counts. Please try again.');
    }

    throw error;
  }
}
