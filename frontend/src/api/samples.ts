import { isAxiosError } from 'axios';
import client from './client';

export type SamplePriority = 'routine' | 'urgent' | 'stat';
export type SampleStatus = 'collected' | 'in-transit' | 'processing' | 'completed' | 'rejected';

export interface SampleDocument {
  _id: string;
  sampleId: string;
  bookingId: string;
  patientId: string;
  patientName: string;
  testDisplayName: string;
  sampleType: string;
  priority: SamplePriority;
  status: SampleStatus;
  handledBy: string;
  rejectionReason?: string;
  statusUpdatedAt: string;
}

export interface GroupedSamples {
  collected: SampleDocument[];
  inTransit: SampleDocument[];
  processing: SampleDocument[];
  completed: SampleDocument[];
  rejected: SampleDocument[];
}

export interface SampleQrLabel {
  sampleId: string;
  patientName: string;
  testDisplayName: string;
  sampleType: string;
  collectedAt: string;
  qrCode: string;
}

export interface CreateSampleDto {
  bookingId: string;
  patientId: string;
  patientName: string;
  testDisplayName: string;
  sampleType: string;
  priority: SamplePriority;
  handledBy: string;
}

function messageFrom(error: unknown, fallback: string): never {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    throw new Error(typeof message === 'string' ? message : fallback);
  }

  throw error;
}

export async function listSamples(): Promise<GroupedSamples> {
  try {
    const { data } = await client.get<GroupedSamples>('/samples');
    return data;
  } catch (error) {
    return messageFrom(error, 'Unable to load samples. Please try again.');
  }
}

export async function getSample(id: string): Promise<SampleDocument> {
  try {
    const { data } = await client.get<SampleDocument>(`/samples/${id}`);
    return data;
  } catch (error) {
    return messageFrom(error, 'Unable to load sample details. Please try again.');
  }
}

export async function getSampleQr(id: string): Promise<SampleQrLabel> {
  try {
    const { data } = await client.get<SampleQrLabel>(`/samples/${id}/qr`);
    return data;
  } catch (error) {
    return messageFrom(error, 'Unable to generate the QR label. Please try again.');
  }
}

export async function createSample(payload: CreateSampleDto): Promise<SampleDocument> {
  try {
    const { data } = await client.post<SampleDocument>('/samples', payload);
    return data;
  } catch (error) {
    return messageFrom(error, 'Unable to create sample. Please try again.');
  }
}

export async function advanceSample(id: string, handledBy: string): Promise<SampleDocument> {
  try {
    const { data } = await client.patch<SampleDocument>(`/samples/${id}/advance`, { handledBy });
    return data;
  } catch (error) {
    return messageFrom(error, 'Unable to advance sample status. Please try again.');
  }
}

export async function rejectSample(id: string, handledBy: string, rejectionReason: string): Promise<SampleDocument> {
  try {
    const { data } = await client.patch<SampleDocument>(`/samples/${id}/reject`, { handledBy, rejectionReason });
    return data;
  } catch (error) {
    return messageFrom(error, 'Unable to reject sample. Please try again.');
  }
}
