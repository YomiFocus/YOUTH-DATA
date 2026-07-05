import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';
import { Registration } from '../types';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

interface Schema {
  registrations: Registration[];
  admin: {
    username: string;
    passwordHash: string;
  };
}

// Default credentials: admin / AdminPassword123!
const DEFAULT_ADMIN = {
  username: 'admin',
  passwordHash: bcrypt.hashSync('AdminPassword123!', 10),
};

// Helper to normalize phone numbers for accurate duplicate checking
// Handles: +2348031234567, 2348031234567, 08031234567, etc.
export function normalizePhoneNumber(phone: string): string {
  // Strip all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  if (digits.startsWith('234') && digits.length === 13) {
    return '0' + digits.substring(3);
  }
  if (digits.length === 10) {
    return '0' + digits;
  }
  return digits;
}

// Clean and normalize name for duplicate checking (trims, removes double spaces, lowercase)
export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

// Clean and normalize email for duplicate checking (trims, lowercase)
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export class Database {
  private static instance: Database;
  private memoryDb: Schema | null = null;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.loadDatabase();
    return this.initPromise;
  }

  private async loadDatabase(): Promise<void> {
    try {
      // Ensure data directory exists
      await fs.mkdir(DB_DIR, { recursive: true });

      try {
        const fileContent = await fs.readFile(DB_FILE, 'utf-8');
        this.memoryDb = JSON.parse(fileContent);
        
        // Ensure structure is correct
        if (!this.memoryDb || !Array.isArray(this.memoryDb.registrations)) {
          throw new Error('Invalid database format');
        }
        
        // Ensure admin account exists
        if (!this.memoryDb.admin) {
          this.memoryDb.admin = DEFAULT_ADMIN;
        }
      } catch (err) {
        // If file doesn't exist or is invalid, seed with defaults
        this.memoryDb = {
          registrations: [],
          admin: DEFAULT_ADMIN,
        };
        await this.saveToFile();
      }
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private async saveToFile(): Promise<void> {
    if (!this.memoryDb) return;
    try {
      const tempFile = `${DB_FILE}.tmp`;
      await fs.writeFile(tempFile, JSON.stringify(this.memoryDb, null, 2), 'utf-8');
      await fs.rename(tempFile, DB_FILE);
    } catch (err) {
      console.error('Failed to write database file:', err);
      throw err;
    }
  }

  public async getRegistrations(): Promise<Registration[]> {
    await this.init();
    return this.memoryDb!.registrations;
  }

  public async getAdmin(): Promise<{ username: string; passwordHash: string }> {
    await this.init();
    return this.memoryDb!.admin;
  }

  public async createRegistration(data: Omit<Registration, 'id' | 'createdAt'>): Promise<Registration> {
    await this.init();

    const normalizedNewName = normalizeName(data.fullName);
    const normalizedNewEmail = normalizeEmail(data.email);
    const normalizedNewPhone = normalizePhoneNumber(data.phoneNumber);

    // Validate duplicate Full Name (Rule 1)
    const nameExists = this.memoryDb!.registrations.some(
      (r) => normalizeName(r.fullName) === normalizedNewName
    );
    if (nameExists) {
      throw new Error('This name has already been used for registration.');
    }

    // Validate duplicate Email (Rule 2)
    const emailExists = this.memoryDb!.registrations.some(
      (r) => normalizeEmail(r.email) === normalizedNewEmail
    );
    if (emailExists) {
      throw new Error('This email address already exists.');
    }

    // Validate duplicate Phone (Rule 3)
    const phoneExists = this.memoryDb!.registrations.some(
      (r) => normalizePhoneNumber(r.phoneNumber) === normalizedNewPhone
    );
    if (phoneExists) {
      throw new Error('This phone number has already been used.');
    }

    // Generate unique ID and createdAt
    const newReg: Registration = {
      ...data,
      id: 'reg_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36),
      fullName: data.fullName.trim().replace(/\s+/g, ' '), // clean whitespace
      email: data.email.trim().toLowerCase(), // normalize
      phoneNumber: data.phoneNumber.trim(),
      createdAt: new Date().toISOString(),
    };

    this.memoryDb!.registrations.push(newReg);
    await this.saveToFile();
    return newReg;
  }

  public async updateRegistration(id: string, updatedData: Partial<Registration>): Promise<Registration> {
    await this.init();
    const index = this.memoryDb!.registrations.findIndex((r) => r.id === id);
    if (index === -1) {
      throw new Error('Registration not found.');
    }

    const currentReg = this.memoryDb!.registrations[index];

    // Check unique constraints for updated fields if they changed
    if (updatedData.fullName && normalizeName(updatedData.fullName) !== normalizeName(currentReg.fullName)) {
      const normalizedNewName = normalizeName(updatedData.fullName);
      const exists = this.memoryDb!.registrations.some(
        (r) => r.id !== id && normalizeName(r.fullName) === normalizedNewName
      );
      if (exists) {
        throw new Error('This name has already been used for registration.');
      }
    }

    if (updatedData.email && normalizeEmail(updatedData.email) !== normalizeEmail(currentReg.email)) {
      const normalizedNewEmail = normalizeEmail(updatedData.email);
      const exists = this.memoryDb!.registrations.some(
        (r) => r.id !== id && normalizeEmail(r.email) === normalizedNewEmail
      );
      if (exists) {
        throw new Error('This email address already exists.');
      }
    }

    if (updatedData.phoneNumber && normalizePhoneNumber(updatedData.phoneNumber) !== normalizePhoneNumber(currentReg.phoneNumber)) {
      const normalizedNewPhone = normalizePhoneNumber(updatedData.phoneNumber);
      const exists = this.memoryDb!.registrations.some(
        (r) => r.id !== id && normalizePhoneNumber(r.phoneNumber) === normalizedNewPhone
      );
      if (exists) {
        throw new Error('This phone number has already been used.');
      }
    }

    const updatedReg: Registration = {
      ...currentReg,
      ...updatedData,
      // Ensure we don't overwrite id or createdAt
      id,
      createdAt: currentReg.createdAt,
    };

    // Clean data fields if updated
    if (updatedData.fullName) updatedReg.fullName = updatedData.fullName.trim().replace(/\s+/g, ' ');
    if (updatedData.email) updatedReg.email = updatedData.email.trim().toLowerCase();
    if (updatedData.phoneNumber) updatedReg.phoneNumber = updatedData.phoneNumber.trim();

    this.memoryDb!.registrations[index] = updatedReg;
    await this.saveToFile();
    return updatedReg;
  }

  public async deleteRegistration(id: string): Promise<boolean> {
    await this.init();
    const initialLength = this.memoryDb!.registrations.length;
    this.memoryDb!.registrations = this.memoryDb!.registrations.filter((r) => r.id !== id);
    
    if (this.memoryDb!.registrations.length < initialLength) {
      await this.saveToFile();
      return true;
    }
    return false;
  }

  public async getStats(): Promise<{
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    byGender: { male: number; female: number; other: number };
    byState: Record<string, number>;
  }> {
    await this.init();
    const regs = this.memoryDb!.registrations;

    const now = new Date();
    
    // Start of today (UTC or local container time)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Start of this week (Sunday or Monday, let's say Sunday)
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    
    // Start of this month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let todayCount = 0;
    let weekCount = 0;
    let monthCount = 0;
    
    const byGender = { male: 0, female: 0, other: 0 };
    const byState: Record<string, number> = {};

    regs.forEach((reg) => {
      const regDate = new Date(reg.createdAt);

      if (regDate >= startOfToday) todayCount++;
      if (regDate >= startOfWeek) weekCount++;
      if (regDate >= startOfMonth) monthCount++;

      // Gender stats
      const gender = (reg.gender || '').toLowerCase();
      if (gender === 'male') byGender.male++;
      else if (gender === 'female') byGender.female++;
      else byGender.other++;

      // State stats
      const state = reg.stateOfOrigin || 'Unknown';
      byState[state] = (byState[state] || 0) + 1;
    });

    return {
      total: regs.length,
      today: todayCount,
      thisWeek: weekCount,
      thisMonth: monthCount,
      byGender,
      byState,
    };
  }
}
