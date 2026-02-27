import { notFound } from "next/navigation";
import CheckoutClient from "./CheckoutClient";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PayPage({ params }: PageProps) {
  const { id } = await params;

  if (!UUID_RE.test(id)) {
    notFound();
  }

  // Fetch payment + merchant details server-side
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(`${appUrl}/api/checkout/${id}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    notFound();
  }

  const data = await res.json();

  return <CheckoutClient paymentId={id} initialData={data} />;
}
