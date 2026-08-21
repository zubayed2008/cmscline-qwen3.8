import NextAuth, { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import dbConnect from '@/utils/db-connect';
import User from '@/models/user-model';
import { rateLimit, RATE_LIMIT_CONFIG } from '@/utils/rate-limit';

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'admin@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        // 1. RATE LIMITING INSIDE AUTHORIZE (Much safer and cleaner)
        // Rate limiting by email prevents brute-force attacks even if the attacker rotates IPs.
        const identifier = credentials.email.toLowerCase();
        
        const { success } = await rateLimit(
          `login:${identifier}`,
          RATE_LIMIT_CONFIG.LOGIN.limit,
          RATE_LIMIT_CONFIG.LOGIN.window
        );

        if (!success) {
          // NextAuth will automatically catch this and return a proper error to the client
          throw new Error('Too many login attempts. Please try again later.');
        }

        await dbConnect();

        const user = await User.findOne({ email: identifier });

        if (!user || !user.isActive) {
          throw new Error('Invalid email or password');
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!isPasswordValid) {
          throw new Error('Invalid email or password');
        }

        // Track last login
        await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/admin/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// 2. STANDARD APP ROUTER EXPORTS
// Do not wrap this in custom GET/POST functions. Let NextAuth handle routing natively.
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };