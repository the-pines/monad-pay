import z from 'zod';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@/db';
import { users } from '@/db/schema';

export const dynamic = 'force-dynamic';

const CreateUserSchema = z.object({
  name: z
    .string()
    .min(1)
    .transform((s) => s.trim()),
  address: z
    .string()
    .min(1)
    .transform((s) => s.trim()),
  provider: z.enum(['gmail', 'apple', 'wallet']),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const parsed = CreateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, address, provider } = parsed.data;
    const normalizedAddress = address.toLowerCase();

    // if the address already exists, do nothing.
    const inserted = await db
      .insert(users)
      .values({ name, address: normalizedAddress, provider })
      .onConflictDoNothing({ target: users.address })
      .returning();

    if (inserted.length > 0) {
      return NextResponse.json(
        { created: true, user: inserted[0] },
        { status: 201 }
      );
    }

    // if exists, fetch the existing record to return it
    const existing = await db.query.users.findFirst({
      where: eq(users.address, normalizedAddress),
    });

    return NextResponse.json(
      { created: false, user: existing },
      { status: 200 }
    );
  } catch (err) {
    console.error('[POST /api/users] error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
