export interface Note {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  content: string;
  tags: string[];
  is_public: boolean;
  created_at: string;
}

export interface Link {
  id: string;
  source_note_id: string;
  target_note_id: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
}
