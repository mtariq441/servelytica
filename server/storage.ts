import { db } from "./db";
import { eq } from "drizzle-orm";
import { users, profiles, userRoles } from "@shared/schema";

export interface UpsertUser {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
}

export interface AuthUser {
  id: string;
  email: string | null;
  username: string;
  displayName: string | null;
  replitUserId: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStorage {
  getUser(id: string): Promise<AuthUser | undefined>;
  upsertUser(user: UpsertUser): Promise<AuthUser>;
}

class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<AuthUser | undefined> {
    const [user] = await db.select().from(users).where(eq(users.replitUserId, id));
    return user as AuthUser | undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<AuthUser> {
    const existingUser = await this.getUser(userData.id);
    
    const buildDisplayName = (firstName?: string | null, lastName?: string | null, fallback?: string | null) => {
      if (firstName && lastName) {
        return `${firstName} ${lastName}`.trim();
      }
      if (firstName) {
        return firstName;
      }
      return fallback || null;
    };
    
    if (existingUser) {
      const [updated] = await db
        .update(users)
        .set({
          email: userData.email ?? existingUser.email,
          displayName: buildDisplayName(userData.firstName, userData.lastName, existingUser.displayName),
          avatarUrl: userData.profileImageUrl ?? existingUser.avatarUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.replitUserId, userData.id))
        .returning();
      return updated as AuthUser;
    }

    const username = userData.email?.split('@')[0] || `user_${userData.id.substring(0, 8)}`;
    const displayName = buildDisplayName(userData.firstName, userData.lastName, username);

    const [newUser] = await db
      .insert(users)
      .values({
        email: userData.email || `${userData.id}@replit.user`,
        username: username,
        displayName: displayName,
        replitUserId: userData.id,
        avatarUrl: userData.profileImageUrl,
      })
      .returning();

    await db.insert(profiles).values({
      userId: newUser.id,
      username: username,
      displayName: displayName,
      avatarUrl: userData.profileImageUrl,
    });

    await db.insert(userRoles).values({
      userId: newUser.id,
      role: 'player',
    });

    return newUser as AuthUser;
  }
}

export const storage = new DatabaseStorage();
