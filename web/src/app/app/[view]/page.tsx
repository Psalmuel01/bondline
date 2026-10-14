import { notFound, redirect } from "next/navigation";
import { PersonalWorkspace } from "@/components/PersonalWorkspace";
const views = ["circles", "commitments", "activity"];
export const dynamicParams = false;
export function generateStaticParams() {
  return views.map((view) => ({ view }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ view: string }>;
}) {
  const { view } = await params;
  return {
    title:
      view === "activity"
        ? "Your activity"
        : view === "circles"
          ? "Your Circles"
          : "Your commitments",
    robots: { index: false, follow: false },
  };
}
export default async function Workspace({
  params,
}: {
  params: Promise<{ view: string }>;
}) {
  const { view } = await params;
  if (!views.includes(view)) notFound();
  if (view === "circles") redirect("/");
  return <PersonalWorkspace view={view} />;
}
