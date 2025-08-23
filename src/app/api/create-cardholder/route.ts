import Stripe from "stripe";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import z from "zod";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key, {});
}

const BodySchema = z.object({
  name: z.string().min(1), // name shown on the card (stripe suggests max 24 chars)
  individual: z.object({
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    dob: z.object({
      day: z.number().int().min(1).max(31),
      month: z.number().int().min(1).max(12),
      year: z.number().int().min(1900).max(2100),
    }),
  }),
  billing: z.object({
    address: z.object({
      line1: z.string().min(1),
      city: z.string().min(1),
      state: z.string().min(1),
      postal_code: z.string().min(1),
      country: z.literal("GB").default("GB"), // ISO 3166-1 alpha-2
      line2: z.string().optional(),
    }),
  }),
  email: z.email().optional(),
  phone_number: z.string().optional(),
  metadata: z.record(z.string(), z.number()).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = BodySchema.parse(body);

    const idempotencyKey =
      req.headers.get("Idempotency-Key") ?? `ch_${randomUUID()}`;

    const params: Stripe.Issuing.CardholderCreateParams = {
      type: "individual",
      status: "active",
      name: data.name,
      email: data.email,
      phone_number: data.phone_number,
      billing: {
        address: {
          line1: data.billing.address.line1,
          line2: data.billing.address.line2,
          city: data.billing.address.city,
          state: data.billing.address.state,
          postal_code: data.billing.address.postal_code,
          country: data.billing.address.country,
        },
      },
      individual: {
        first_name: data.individual.first_name,
        last_name: data.individual.last_name,
        dob: {
          day: data.individual.dob.day,
          month: data.individual.dob.month,
          year: data.individual.dob.year,
        },
      },
      metadata: data.metadata,
    };

    const cardholder = await getStripe().issuing.cardholders.create(params, {
      idempotencyKey,
    });

    return NextResponse.json(cardholder, { status: 201 });
  } catch (err) {
    console.error("[POST /api/create-cardholder] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
