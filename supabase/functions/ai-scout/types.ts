// types.ts
export interface Database {
  public: {
    Tables: {
      tools: {
        Row: {
          id: number;
          name: string;
          description: string;
          link: string;
          slug: string;
          is_approved: boolean;
          suggester_email: string;
          embedding?: unknown;
          created_at: string;
        };
        Insert: {
          name: string;
          description: string;
          link: string;
          slug: string;
          is_approved?: boolean;
          suggester_email: string;
          embedding?: unknown;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string;
          link?: string;
          slug?: string;
          is_approved?: boolean;
          suggester_email?: string;
          embedding?: unknown;
          created_at?: string;
        };
      };
    };
  };
}
