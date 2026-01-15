-- Migration: 024_admin_dynamic_folders
-- Description: Create knowledge_nodes table for dynamic folder structure

CREATE TABLE IF NOT EXISTS knowledge_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    node_type TEXT NOT NULL CHECK (node_type IN ('board', 'class', 'subject', 'topic', 'folder')),
    metadata JSONB DEFAULT '{}'::jsonb, -- Store specific tags like { "board": "cbse" } here
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid()
);

-- Enable RLS
ALTER TABLE knowledge_nodes ENABLE ROW LEVEL SECURITY;

-- Policies (Open for authenticated admins)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'knowledge_nodes' 
      AND policyname = 'Enable all access for authenticated users'
  ) THEN
    CREATE POLICY "Enable all access for authenticated users" ON knowledge_nodes
        FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);
  END IF;
END$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_parent ON knowledge_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_type ON knowledge_nodes(node_type);
