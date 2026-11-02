export type NodeLinks = Record<string, string>;

export interface Post {
  slug: string;
  title: string;
  diagramId: string;
  relatedSlugs: string[];
}

export interface Diagram {
  id: string;
  source: string;
  nodeLinks: NodeLinks;
}

export interface ContentLibrary {
  title: string;
  overviewDiagramId: string;
  posts: Post[];
  diagrams: Record<string, Diagram>;
}
