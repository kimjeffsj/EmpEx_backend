export interface LoginDto {
  email: string;
  password: string;
}

export interface TokenPayload {
  id: number;
  email: string;
  role: string;
  employeeId?: number;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    employeeId?: number;
  };
}
