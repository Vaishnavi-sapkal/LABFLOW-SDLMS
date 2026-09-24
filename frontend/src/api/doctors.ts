import { isAxiosError } from 'axios';
import client from './client';

export interface DoctorDocument {
  _id: string;
  doctorId?: string;
  fullName: string;
  specialization?: string;
  qualification?: string;
  registrationNumber?: string;
  mobile?: string;
  email?: string;
  isActive?: boolean;
  userId?: string;
}

export interface CreateDoctorDto {
  fullName: string;
  specialization?: string;
  qualification?: string;
  registrationNumber?: string;
  email?: string;
  mobile?: string;
  isActive?: boolean;
  userId?: string;
}

export type UpdateDoctorDto = Partial<CreateDoctorDto>;

export async function listDoctors(search?: string): Promise<DoctorDocument[]> {
  try {
    const { data } = await client.get<DoctorDocument[]>('/doctors', { params: search ? { search } : undefined });
    return data;
  } catch (error) {
    if (isAxiosError(error)) {
      const message = error.response?.data?.message;
      throw new Error(typeof message === 'string' ? message : 'Unable to load doctors. Please try again.');
    }

    throw error;
  }
}

export async function getDoctor(id: string): Promise<DoctorDocument> {
  try {
    const { data } = await client.get<DoctorDocument>(`/doctors/${id}`);
    return data;
  } catch (error) {
    if (isAxiosError(error)) {
      const message = error.response?.data?.message;
      throw new Error(typeof message === 'string' ? message : 'Unable to load doctor details. Please try again.');
    }

    throw error;
  }
}

export async function getMyDoctor(): Promise<DoctorDocument> {
  try { return (await client.get<DoctorDocument>('/doctors/me')).data; }
  catch (error) { if (isAxiosError(error)) throw new Error(typeof error.response?.data?.message === 'string' ? error.response.data.message : 'Unable to load your doctor profile.'); throw error; }
}

export async function updateMyDoctorProfile(payload: Pick<UpdateDoctorDto, 'specialization' | 'qualification' | 'registrationNumber' | 'mobile'>): Promise<DoctorDocument> {
  try {
    const { data } = await client.patch<DoctorDocument>('/doctors/me', payload);
    return data;
  } catch (error) {
    if (isAxiosError(error)) {
      const message = error.response?.data?.message;
      throw new Error(typeof message === 'string' ? message : 'Unable to update your doctor profile.');
    }
    throw error;
  }
}

export async function createDoctor(payload: CreateDoctorDto): Promise<DoctorDocument> {
  try {
    const { data } = await client.post<DoctorDocument>('/doctors', payload);
    return data;
  } catch (error) {
    if (isAxiosError(error)) {
      const message = error.response?.data?.message;
      throw new Error(typeof message === 'string' ? message : 'Unable to create doctor. Please try again.');
    }

    throw error;
  }
}

export async function updateDoctor(id: string, payload: UpdateDoctorDto): Promise<DoctorDocument> {
  try {
    const { data } = await client.patch<DoctorDocument>(`/doctors/${id}`, payload);
    return data;
  } catch (error) {
    if (isAxiosError(error)) {
      const message = error.response?.data?.message;
      throw new Error(typeof message === 'string' ? message : 'Unable to update doctor. Please try again.');
    }

    throw error;
  }
}

export async function deleteDoctor(id: string): Promise<unknown> {
  try {
    const { data } = await client.delete(`/doctors/${id}`);
    return data;
  } catch (error) {
    if (isAxiosError(error)) {
      const message = error.response?.data?.message;
      throw new Error(typeof message === 'string' ? message : 'Unable to delete doctor. Please try again.');
    }

    throw error;
  }
}
