import { syncLanding } from './sync-landing.mjs';
syncLanding({ check: process.argv.includes('--check') });
