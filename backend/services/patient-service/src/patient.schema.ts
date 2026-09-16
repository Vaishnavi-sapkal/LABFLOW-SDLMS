import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PatientDocument = HydratedDocument<Patient>;

@Schema({ timestamps: true })
export class Patient {
  @Prop({ required: true, unique: true, index: true })
  patientId!: string;

  @Prop({ required: true, trim: true })
  fullName!: string;

  @Prop({ required: true })
  dateOfBirth!: Date;

  @Prop({ required: true, enum: ['male', 'female', 'other'] })
  gender!: string;

  @Prop({ enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] })
  bloodGroup?: string;

  @Prop({ trim: true })
  aadhaarNumber?: string;

  @Prop({ required: true, trim: true, unique: true, index: true })
  mobile!: string;

  @Prop({ trim: true, lowercase: true })
  email?: string;

  @Prop({ trim: true })
  address?: string;

  @Prop({ trim: true })
  city?: string;

  @Prop({ trim: true })
  state?: string;

  @Prop({ trim: true })
  pincode?: string;

  @Prop({ trim: true })
  referringDoctor?: string;

  @Prop({ trim: true })
  emergencyContact?: string;

  @Prop({ type: [String], default: [] })
  conditions!: string[];

  @Prop({ type: [String], default: [] })
  allergies!: string[];

  @Prop({ default: false })
  consentToTesting!: boolean;

  @Prop({ default: false })
  consentToDetailsVerification!: boolean;

  // This is the auth-service User _id only; patient-service does not join across databases.
  @Prop({ trim: true })
  userId?: string;
}

export const PatientSchema = SchemaFactory.createForClass(Patient);

PatientSchema.pre('validate', function () {
  if (!this.patientId) {
    // A random five-digit suffix avoids a separate counter collection; the unique index
    // remains the final collision safeguard and PatientService retries a collision.
    this.patientId = `LF-P-${Math.floor(10000 + Math.random() * 90000)}`;
  }
});
