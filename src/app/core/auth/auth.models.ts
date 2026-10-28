export interface UserInformation {
  userId: string;
  email: string;
  name: string;
  surname: string | null;
  picture: string | null;
  authProviders: ('password' | 'google')[];
}

/** Response body of /user/signup, /user/signin and /user/google. */
export interface AuthResponse {
  token: string;
  /** Token lifetime in seconds. */
  expiresIn: number;
  userInformationOnSignIn: UserInformation;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpDetails extends SignInCredentials {
  name: string;
  surname?: string;
}
