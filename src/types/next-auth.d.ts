import type { DefaultSession } from "next-auth";
import type { ActorRole } from "@/lib/permissions/rules";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: ActorRole;
      programIds: string[];
      studentProfileId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: ActorRole;
    programIds: string[];
    studentProfileId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: ActorRole;
    programIds: string[];
    studentProfileId: string | null;
  }
}
