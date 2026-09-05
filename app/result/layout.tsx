import type { Metadata } from "next";

/**
 * /result is a client component, and client components cannot export
 * metadata. This layout sets the title for it and for /result/[id].
 */
export const metadata: Metadata = {
  title: "Your Trip",
};

export default function ResultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
