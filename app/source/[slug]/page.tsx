import { SourceRouteView } from "../../source-route-view";

export default async function SourcePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <SourceRouteView sourceKey={slug} />;
}
