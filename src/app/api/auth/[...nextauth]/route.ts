import NextAuth, { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { headers } from 'next/headers'; 
import dbConnect from '@/utils/db-connect';
import User from '@/models/user-model';
import AuditService from '@/services/audit-service'; 
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

        // 1. Rate Limiting
        const identifier = credentials.email.toLowerCase();
        const { success } = await rateLimit(
          `login:${identifier}`,
          RATE_LIMIT_CONFIG.LOGIN.limit,
          RATE_LIMIT_CONFIG.LOGIN.window
        );
        if (!success) throw new Error('Too many login attempts. Please try again later.');

        await dbConnect();
        const user = await User.findOne({ email: identifier });

        if (!user || !user.isActive) throw new Error('Invalid email or password');

        const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isPasswordValid) throw new Error('Invalid email or password');

        // Track last login
        await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });

        // --- EXPLICIT LOGIN AUDIT LOG ---
        // Extract IP/UserAgent directly from the NextAuth request object
        const forwarded = req.headers?.['x-forwarded-for'];
        const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
        const userAgent = req.headers?.['user-agent'] || 'unknown';

        // Fire and forget: log the login without delaying the response
        AuditService.createAuditLog({
          action: 'login',
          entityType: 'User',
          entityId: user._id.toString(),
          userId: user._id.toString(),
          ipAddress: ip,
          userAgent,
        }).catch(err => console.error('Audit log (login) failed:', err));
        // --------------------------------

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

  events: {
    async signOut(message) {
      try {
        // message.token contains the JWT payload (which has our custom `id` field)
        const userId = message.token?.id as string | undefined;
        if (!userId) return; // If no user ID in token, skip

        // Next.js 15: headers() is async. (If on Next.js 14, remove the `await`)
        const headersList = await headers();
        const forwarded = headersList.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
        const userAgent = headersList.get('user-agent') || 'unknown';

        await AuditService.createAuditLog({
          action: 'logout',
          entityType: 'User',
          entityId: userId,
          userId: userId,
          ipAddress: ip,
          userAgent,
        });
      } catch (error) {
        console.error('Audit log (logout) failed:', error);
      }
    }
  }
  // ---------------------------------
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };