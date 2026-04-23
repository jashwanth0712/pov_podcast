import { SessionSetup } from "@/components/session/SessionSetup";
import type { Id } from "../../../../../convex/_generated/dataModel";

interface SessionSetupPageProps {
  params: Promise<{ scenarioId: string }>;
}

export default async function SessionSetupPage({ params }: SessionSetupPageProps) {
  const { scenarioId } = await params;
  return <SessionSetup scenarioId={scenarioId as Id<"scenarios">} />;
}
