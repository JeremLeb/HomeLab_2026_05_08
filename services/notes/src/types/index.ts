export type NoteListItem = {
  id: string;
  title: string;
  parentId: string | null;
  position: number;
  updatedAt: string;
  tags?: string[];
  status?: string;
  children?: NoteListItem[];
};

export type NoteDetail = {
  id: string;
  title: string;
  content: string;
  keyPoints: string[];
  tags: string[];
  status?: string;
  parentId: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type SearchResult = {
  id: string;
  title: string;
  snippet: string;
};

export type Connection = {
  id: string;
  title: string;
  type: "manual" | "ai";
  strength?: number;
  matchedConcepts?: string[];
};

export type SettingsPublic = {
  aiProvider: string;
  ollamaUrl: string;
  ollamaModel: string;
  openaiKeySet: boolean;
  openaiModel: string;
  anthropicKeySet: boolean;
  anthropicModel: string;
  linkThreshold: number;
  theme: string;
  whisperUrl: string;
};
