import { SessionPlayer } from "@/components/session/SessionPlayer";
import type { Id } from "../../../../convex/_generated/dataModel";

interface SessionPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function SessionPage({ params }: SessionPageProps) {
  const { sessionId } = await params;
  return <SessionPlayer sessionId={sessionId as Id<"sessions">} />;
}
