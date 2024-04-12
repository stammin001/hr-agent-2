import type { NextAuthConfig } from 'next-auth';
import type { SessionCallbackParams } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnHome = nextUrl.pathname.startsWith('/main');
      if (isOnHome) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (isLoggedIn) {
        return Response.redirect(new URL('/main', nextUrl));
      }
      return true;
    },
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return Promise.resolve(token);
    },
    session: async ({session, token}) => {
      session.user.id = token.id;
      console.log('Session:', session);
      return Promise.resolve(session);
    }
  },
  providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;