import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ username: z.string(), password: z.string().min(6) })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { username, password } = parsedCredentials.data;
          
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.username, username));
          
          if (!user) return null;
          
          const passwordsMatch = await bcrypt.compare(password, user.password);
          if (passwordsMatch) return user as any;
        }

        console.log("Invalid credentials");
        return null;
      },
    }),
  ],
});
