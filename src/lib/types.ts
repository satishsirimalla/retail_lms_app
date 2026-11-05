

import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  photoURL?: string;
  displayName?: string; // Gamertag
  employeeId?: string;
  authProvider: 'google' | 'email';
  lastLogin?: Timestamp;
  
  // Onboarding Step 1
  userType?: 'Retail/Call Center Sales Associate (RSA)' | 'Territory Sales Manager (TSM)' | 'Business-to-business (B2B)' | 'Customer Service (gUP)' | 'Google Store Rep (GSR)' | 'Googler (Internal)';
  userCountry?: string;
  preferredLanguage?: string;
  timezone?: string;

  // Onboarding Step 2
  workEmail?: string;
  employmentVerified?: boolean;
  storeType?: string;
  retailerOrPartner?: string;
  storeName?: string;
  storeLocation?: string;
  storeTypeId?: string;
  retailerName?: string;
  storeId?: string;


  // Onboarding Step 3
  promotionalNotifications?: boolean;
  shareTrainingData?: boolean;
  termsAndConditions?: boolean;

  // App-specific roles/status
  role?: 'user' | 'admin';
  status?: 'active' | 'inactive';
  isChampion?: boolean;
  onboardingCompleted?: boolean;
  communicationEmail?: 'personal' | 'work';
  isGoogleAuthUser?: boolean;
}

export interface Training {
  id: string;
  title: string;
  description: string;
  type: 'Online' | 'ILT' | 'VILT' | 'Legacy';
  thumbnailUrl: string;
  duration?: string;
  launchDate?: Timestamp;
  endDate?: Timestamp;
  topic: string;
  contentUrl?: string;
  location?: string;
  eventDetails?: string;
  selfRegistration?: boolean;
  slotsAvailable?: number;
  hostName?: string;
  enrollmentCount?: number;
}

export interface Enrollment {
    id: string;
    userId: string;
    trainingId: string;
    enrolledDate: Timestamp;
    completedDate?: Timestamp;
    status: 'enrolled' | 'completed';
    user?: Partial<UserProfile>;
    training?: Partial<Training>;
    rating?: number;
    performance?: string;
}

export interface Post {
    id: string;
    content: string;
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    createdAt: Timestamp;
    likeCount: number;
    commentCount: number;
}

export interface Comment {
    id: string;
    content: string;
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    createdAt: Timestamp;
}

export interface Like {
    id: string;
    createdAt: Timestamp;
}


// For work email verification
export interface VerificationCode {
  code: string;
  expires: Timestamp;
}
