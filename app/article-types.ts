import type { Id } from "../convex/_generated/dataModel";

export type Article = {
  _id: Id<"articles">;
  _creationTime: number;
  title: string;
  url: string;
  sourceId: Id<"sources">;
  sourceName: string;
  publishedAt: number;
  discoveredAt: number;
  topic?: string;
  description?: string;
  author?: string;
  imageUrl?: string;
  score?: number;
  commentCount?: number;
};

export type StoryCluster = {
  primary: Article;
  articles: Article[];
  sourceCount: number;
  latestAt: number;
  isCluster: boolean;
};
