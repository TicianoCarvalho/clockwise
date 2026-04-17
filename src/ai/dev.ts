'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-anomaly-report.ts';
import '@/ai/flows/geocode-address.ts';
import '@/ai/flows/verify-face.ts';
