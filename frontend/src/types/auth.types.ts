export type Role = 'coach' | 'analyst' | 'scout' | 'fan';

export type PrimaryGoal = 'win_more' | 'find_talent' | 'reduce_injuries' | 'follow_team' | 'analyze_data';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role | 'admin';
  avatar?: string;
  profileImage?: string | null;
  username?: string | null;
  age?: number | null;
  bio?: string | null;
  avatarColor?: string | null;
  favoriteClub: string | null;
  primaryGoal: PrimaryGoal | null;
  onboardingComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileUpdate {
  name?: string;
  bio?: string | null;
  avatarColor?: string | null;
  profileImage?: string | null;
  username?: string | null;
  age?: number | null;
  role?: Role;
  favoriteClub?: string | null;
  primaryGoal?: PrimaryGoal | null;
  onboardingComplete?: boolean;
}

export interface AuthResponse {
  token: string;
  refreshToken?: string;
  user: User;
}

export interface AuthError {
  error: string;
  message: string;
  statusCode: number;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, role?: string) => Promise<User>;
  signup: (name: string, email: string, password: string, role?: string) => Promise<User>;
  logout: () => Promise<void>;
  updateProfile: (patch: ProfileUpdate) => Promise<User>;
  deleteAccount: () => Promise<void>;
  error: string | null;
  setError: (error: string | null) => void;
}
