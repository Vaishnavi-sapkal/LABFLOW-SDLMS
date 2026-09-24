import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Patient } from './patient.schema';
import { PatientService } from './patient.service';

describe('PatientService', () => {
  let service: PatientService;
  const model = {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientService,
        { provide: getModelToken(Patient.name), useValue: model },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();
    service = module.get(PatientService);
  });

  it('creates a patient with the supplied data', async () => {
    const dto = { fullName: 'Asha Singh', mobile: '9876543210' } as any;
    const patient = { _id: 'patient-1', ...dto };
    model.create.mockResolvedValue(patient);

    await expect(service.create(dto)).resolves.toBe(patient);
    expect(model.create).toHaveBeenCalledWith(dto);
  });

  it('retries a duplicate generated patient ID once', async () => {
    const dto = { fullName: 'Asha Singh' } as any;
    const patient = { _id: 'patient-1', ...dto };
    model.create.mockRejectedValueOnce({ code: 11000 }).mockResolvedValueOnce(patient);

    await expect(service.create(dto)).resolves.toBe(patient);
    expect(model.create).toHaveBeenCalledTimes(2);
  });

  it('allows multiple patients to be created with the same mobile number', async () => {
    const firstDto = { fullName: 'Asha Singh', mobile: '9876543210' } as any;
    const secondDto = { fullName: 'Ravi Singh', mobile: '9876543210' } as any;
    const firstPatient = { _id: 'patient-1', ...firstDto };
    const secondPatient = { _id: 'patient-2', ...secondDto };
    model.create.mockResolvedValueOnce(firstPatient).mockResolvedValueOnce(secondPatient);

    await expect(service.create(firstDto)).resolves.toBe(firstPatient);
    await expect(service.create(secondDto)).resolves.toBe(secondPatient);
    expect(model.create).toHaveBeenCalledWith(firstDto);
    expect(model.create).toHaveBeenCalledWith(secondDto);
  });

  it('turns two duplicate ID collisions into a conflict', async () => {
    model.create.mockRejectedValue({ code: 11000 });

    await expect(service.create({} as any)).rejects.toBeInstanceOf(ConflictException);
  });

  it('escapes search text and returns patients newest first', async () => {
    const exec = jest.fn().mockResolvedValue([{ _id: 'patient-1' }]);
    const sort = jest.fn().mockReturnValue({ exec });
    model.find.mockReturnValue({ sort });

    await expect(service.findAll('Asha.+')).resolves.toEqual([{ _id: 'patient-1' }]);
    expect(model.find).toHaveBeenCalledWith({
      $or: expect.arrayContaining([
        { fullName: { $regex: 'Asha\\.\\+', $options: 'i' } },
        { patientId: { $regex: 'Asha\\.\\+', $options: 'i' } },
        { mobile: { $regex: 'Asha\\.\\+', $options: 'i' } },
        { email: { $regex: 'Asha\\.\\+', $options: 'i' } },
      ]),
    });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
  });

  it('returns only receptionist-safe Patient 360 sections', async () => {
    const patient = { _id: 'patient-1', userId: 'user-1' };
    const findExec = jest.fn().mockResolvedValue(patient);
    model.findById.mockReturnValue({ exec: findExec });
    const get = jest.fn((key: string) => ({
      INTERNAL_SERVICE_SECRET: 'internal-secret',
      BOOKING_SERVICE_URL: 'http://bookings',
      BILLING_SERVICE_URL: 'http://billing',
    })[key]);
    (service as any).configService.get = get;
    const fetchMock = jest.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: true, json: async () => [] } as any);

    await expect(service.getDetails('patient-1', 'receptionist')).resolves.toEqual({
      profile: patient, bookings: [], billing: [], account: { portalAccountLinked: true },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith('http://bookings/bookings?patientId=patient-1', { headers: { 'x-internal-service-key': 'internal-secret' } });
    expect(fetchMock).toHaveBeenCalledWith('http://billing/billing?patientId=patient-1', { headers: { 'x-internal-service-key': 'internal-secret' } });
    fetchMock.mockRestore();
  });

  it('rejects Patient 360 requests from non-staff roles before loading a patient', async () => {
    await expect(service.getDetails('patient-1', 'patient')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.getDetails('patient-1', 'doctor')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.getDetails('patient-1', 'technician')).rejects.toBeInstanceOf(ForbiddenException);
    expect(model.findById).not.toHaveBeenCalled();
  });

  it('rejects a report that belongs to a different Patient 360 target', async () => {
    const patient = { _id: 'patient-1' };
    model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(patient) });
    (service as any).configService.get = jest.fn((key: string) => ({
      INTERNAL_SERVICE_SECRET: 'internal-secret',
      REPORT_SERVICE_URL: 'http://reports',
    })[key]);
    const fetchMock = jest.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: true, json: async () => ({ _id: 'report-2', patientId: 'patient-2' }) } as any);

    await expect(service.getPatientReport('patient-1', 'report-2', 'admin')).rejects.toBeInstanceOf(ForbiddenException);
    expect(fetchMock).toHaveBeenCalledWith('http://reports/reports/report-2', { headers: { 'x-internal-service-key': 'internal-secret' } });
    fetchMock.mockRestore();
  });

  it('returns a report only when it belongs to the requested Patient 360 target', async () => {
    const patient = { _id: 'patient-1' };
    const report = { _id: 'report-1', patientId: 'patient-1', reportNo: 'LF-RPT-2609-001' };
    model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(patient) });
    (service as any).configService.get = jest.fn((key: string) => ({
      INTERNAL_SERVICE_SECRET: 'internal-secret',
      REPORT_SERVICE_URL: 'http://reports',
    })[key]);
    const fetchMock = jest.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: true, json: async () => report } as any);

    await expect(service.getPatientReport('patient-1', 'report-1', 'admin')).resolves.toEqual(report);
    fetchMock.mockRestore();
  });

  it('rejects Patient 360 report access from non-admin roles before loading a patient', async () => {
    await expect(service.getPatientReport('patient-1', 'report-1', 'receptionist')).rejects.toBeInstanceOf(ForbiddenException);
    expect(model.findById).not.toHaveBeenCalled();
  });

  it('updates an existing patient and rejects a missing one', async () => {
    const exec = jest.fn().mockResolvedValueOnce({ _id: 'patient-1', city: 'Pune' }).mockResolvedValueOnce(null);
    model.findByIdAndUpdate.mockReturnValue({ exec });

    await expect(service.update('patient-1', { city: 'Pune' } as any)).resolves.toMatchObject({ city: 'Pune' });
    expect(model.findByIdAndUpdate).toHaveBeenCalledWith('patient-1', { city: 'Pune' }, { new: true, runValidators: true });
    await expect(service.update('missing', {} as any)).rejects.toBeInstanceOf(NotFoundException);
  });
});
