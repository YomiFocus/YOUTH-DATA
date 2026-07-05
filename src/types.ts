export interface Registration {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  gender: 'male' | 'female' | 'other' | string;
  dob: string;
  address: string;
  stateOfOrigin: string;
  occupation: string;
  education?: string;
  passportPhoto?: string; // base64 encoded image
  skills?: string;
  createdAt: string;
}

export interface AdminUser {
  username: string;
  passwordHash: string;
}

export interface DashboardStats {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  byGender: {
    male: number;
    female: number;
    other: number;
  };
  byState: Record<string, number>;
}

export interface CaptchaData {
  id: string;
  question: string;
  solution: string;
  expiresAt: number;
}
