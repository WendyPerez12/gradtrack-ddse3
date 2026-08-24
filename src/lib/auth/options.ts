import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { loginSchema } from "@/lib/validations/auth";
import { recordAudit } from "@/modules/audit/audit-service";

/**
 * Configuración de Auth.js / NextAuth (v4) con credenciales.
 * Sesión por JWT: no hay tabla de sesiones y el rol viaja firmado en la cookie.
 * El registro público está deshabilitado; las cuentas las crea administración.
 */
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/login", error: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        email: { label: "Correo electrónico", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
          include: {
            memberships: { select: { programId: true } },
            studentProfile: { select: { id: true, programId: true, active: true } },
          },
        });

        // Mismo mensaje y coste aproximado para usuario inexistente o inactivo:
        // no revelamos qué correos existen.
        if (!user || !user.active) {
          await bcrypt.compare(parsed.data.password, "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalid");
          return null;
        }

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        const programIds = new Set(user.memberships.map((m) => m.programId));
        if (user.studentProfile?.programId) programIds.add(user.studentProfile.programId);

        await recordAudit({
          userId: user.id,
          action: "LOGIN",
          entityType: "User",
          entityId: user.id,
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          programIds: [...programIds],
          studentProfileId: user.studentProfile?.id ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.programIds = user.programIds;
        token.studentProfileId = user.studentProfileId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.programIds = token.programIds ?? [];
        session.user.studentProfileId = token.studentProfileId ?? null;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
};
