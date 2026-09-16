export interface User {
  id: number;
  email: string;
  username: string;
  preferred_name: string;
  avatar: string | null;
  currency: string;
  timezone: string;
  date_joined: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginResponse extends AuthTokens {
  user: User;
}
