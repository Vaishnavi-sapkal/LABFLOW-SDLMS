import { isAxiosError } from 'axios';
import client from './client';

export type PatientGender = 'male' | 'female' | 'other';
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export interface CreatePatientDto {
  fullName: string;
  dateOfBirth: string;
  gender: PatientGender;
  bloodGroup?: BloodGroup;
  aadhaarNumber?: string;
  mobile: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  referringDoctor?: string;
  emergencyContact?: string;
  conditions?: string[];
  allergies?: string[];
  consentToTesting: boolean;
  consentToDetailsVerification: boolean;
  userId?: string;
}

export interface CreatedPatient extends CreatePatientDto {
  patientId: string;
  _id?: string;
}

export async function listPatients(search?: string): Promise<CreatedPatient[]> {
  try {
    const { data } = await client.get<CreatedPatient[]>('/patients', { params: search ? { search } : undefined });
    return data;
  } catch (error) {
    if (isAxiosError(error)) {
      const message = error.response?.data?.message;
      throw new Error(typeof message === 'string' ? message : 'Unable to load patient profiles. Please try again.');
    }

    throw error;
  }
}

export async function createPatient(payload: CreatePatientDto): Promise<CreatedPatient> {
  try {
    const { data } = await client.post<CreatedPatient>('/patients', payload);
    return data;
  } catch (error) {
    if (isAxiosError(error)) {
      const message = error.response?.data?.message;
      throw new Error(typeof message === 'string' ? message : 'Unable to register patient. Please try again.');
    }

    throw error;
  }
}

export interface PatientPortalData { patient: CreatedPatient; bookings: import('./bookings').CreatedBooking[]; reports: import('./reports').ReportDocument[]; invoices: import('./billing').Invoice[]; }

export interface Patient360Data {
  profile: CreatedPatient;
  bookings: import('./bookings').CreatedBooking[];
  billing: import('./billing').Invoice[];
  account: { portalAccountLinked: boolean };
  samples?: import('./samples').GroupedSamples;
  results?: import('./results').ResultDocument[];
  reports?: import('./reports').ReportDocument[];
}

export async function getMyPatientProfile(): Promise<CreatedPatient> {
  try {
    const { data } = await client.get<CreatedPatient>('/patients/me');
    return data;
  } catch (error) {
    if (isAxiosError(error)) {
      const message = error.response?.data?.message;
      throw new Error(typeof message === 'string' ? message : 'Unable to load your patient profile.');
    }
    throw error;
  }
}

export async function getMyPatientPortal(): Promise<PatientPortalData> {
  try { return (await client.get<PatientPortalData>('/patients/me/portal')).data; }
  catch (error) { if (isAxiosError(error)) throw new Error(typeof error.response?.data?.message === 'string' ? error.response.data.message : 'Unable to load your portal.'); throw error; }
}

export async function getPatientDetails(id: string): Promise<Patient360Data> {
  try { return (await client.get<Patient360Data>(`/patients/${id}/details`)).data; }
  catch (error) { if (isAxiosError(error)) throw new Error(typeof error.response?.data?.message === 'string' ? error.response.data.message : 'Unable to load Patient 360 details.'); throw error; }
}

export async function getPatientReport(patientId: string, reportId: string): Promise<import('./reports').ReportDocument> {
  try { return (await client.get<import('./reports').ReportDocument>(`/patients/${patientId}/reports/${reportId}`)).data; }
  catch (error) { if (isAxiosError(error)) throw new Error(typeof error.response?.data?.message === 'string' ? error.response.data.message : 'Unable to load this report.'); throw error; }
}

export async function updatePatient(id: string, payload: Partial<CreatePatientDto>): Promise<CreatedPatient> {
  try {
    const { data } = await client.patch<CreatedPatient>(`/patients/${id}`, payload);
    return data;
  } catch (error) {
    if (isAxiosError(error)) {
      const message = error.response?.data?.message;
      throw new Error(typeof message === 'string' ? message : 'Unable to link the patient account. Please try again.');
    }
    throw error;
  }
}
