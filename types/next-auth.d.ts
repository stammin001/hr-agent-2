import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      image: string;
    }
  }

  interface JWT {
    id: number;
    email: string;
  }

  interface SessionCallbackParams {
    session: Session;
    token: JWT;
  }
  
}