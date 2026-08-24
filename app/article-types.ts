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
  externalId?: string;
  author?: string;
  imageUrl?: string;
  content?: string;
  canonicalUrl?: string;
  scrapedAt?: number;
  score?: number;
  commentCount?: number;
};
