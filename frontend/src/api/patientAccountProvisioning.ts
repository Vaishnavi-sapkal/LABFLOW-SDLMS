import { registerAccount } from './auth';
import {
  createPatient,
  type CreatedPatient,
  type CreatePatientDto,
} from './patients';

export interface PatientAccountProvisioningInput extends CreatePatientDto {
  password: string;
  rollbackAccount?: (userId: string) => Promise<void>;
}

/**
 * Creates the portal user and a linked patient profile.
 */
export async function createOrLinkPatientAccount(
  input: PatientAccountProvisioningInput,
): Promise<{ accountId: string; patient: CreatedPatient }> {
  if (!input.fullName.trim()) throw new Error('A patient name is required.');
  if (Number.isNaN(new Date(input.dateOfBirth).getTime())) throw new Error('A valid date of birth is required.');
  if (!/^\+?[1-9]\d{7,14}$/.test(input.mobile.trim())) throw new Error('A valid mobile number is required.');
  if (input.aadhaarNumber && !/^\d{12}$/.test(input.aadhaarNumber)) throw new Error('Government ID must contain exactly 12 digits.');
  if (!input.email || !input.password) {
    throw new Error('An email address and temporary password are required for a patient account.');
  }

  const account = await registerAccount({
    name: input.fullName,
    email: input.email,
    password: input.password,
    role: 'patient',
  });
  const { password: _password, rollbackAccount, ...patientPayload } = input;
  const profilePayload: CreatePatientDto = { ...patientPayload, userId: account.id };

  try {
    const patient = await createPatient(profilePayload);

    return { accountId: account.id, patient };
  } catch (profileError) {
    if (rollbackAccount) {
      try {
        await rollbackAccount(account.id);
      } catch {
        throw new Error('The patient profile could not be created and the new login could not be rolled back. Delete the account from the account list before retrying.');
      }
    }
    throw profileError;
  }
}
