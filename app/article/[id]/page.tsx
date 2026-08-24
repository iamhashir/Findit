import { ArticleRouteView } from "../../article-route-view";

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ArticleRouteView id={id} />;
}
