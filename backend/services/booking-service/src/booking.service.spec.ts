import { ConflictException } from '@nestjs/common';
import { BookingService } from './booking.service';

describe('BookingService patient booking', () => {
  const model = { exists: jest.fn() };
  const service = new BookingService(model as any, {} as any, {} as any);

  beforeEach(() => jest.clearAllMocks());

  it('derives the patient ID from the authenticated user and overrides a tampered value', async () => {
    const create = jest.fn().mockResolvedValue({ bookingId: 'LF-BK-12345', patientId: 'patient-own' });
    (service as any).getPatientIdForUser = jest.fn().mockResolvedValue('patient-own');
    (service as any).create = create;

    await expect(service.createForPatient('user-own', {
      patientId: 'patient-other', doctorId: 'doctor-1', testIds: ['66a0ebfcad4f3d8047d0264f'], scheduledDate: '2026-09-24', scheduledSlot: '09:00 AM',
    } as any)).resolves.toMatchObject({ patientId: 'patient-own' });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ patientId: 'patient-own' }));
  });

  it('rejects an already occupied slot before creating a patient booking', async () => {
    model.exists.mockResolvedValue({ _id: 'booking-existing' });

    await expect(service.create({ patientId: 'patient-own', doctorId: 'doctor-1', testIds: ['66a0ebfcad4f3d8047d0264f'], scheduledDate: '2026-09-24', scheduledSlot: '09:00 AM' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates a patient booking through the established booking workflow', async () => {
    const create = jest.fn().mockResolvedValue({ bookingId: 'LF-BK-12345', patientId: 'patient-own', status: 'pending' });
    (service as any).getPatientIdForUser = jest.fn().mockResolvedValue('patient-own');
    (service as any).create = create;

    await expect(service.createForPatient('user-own', { doctorId: 'doctor-1', testIds: ['66a0ebfcad4f3d8047d0264f'], scheduledDate: '2026-09-24', scheduledSlot: '09:00 AM' })).resolves.toMatchObject({ status: 'pending' });
  });
});
