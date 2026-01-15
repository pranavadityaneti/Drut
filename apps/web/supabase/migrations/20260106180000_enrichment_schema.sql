-- 1. Create the Knowledge Nodes Table (Simplified Hierarchy)
create table if not exists knowledge_nodes (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  -- FIXED: Removed 'subtopic'. Only 'chapter' exists as a parent container.
  -- 'topic' is used for the specific concept (e.g. "Torque") if needed, but no deep nesting.
  node_type text check (node_type in ('chapter', 'topic')), 
  metadata jsonb default '{}'::jsonb, -- Stores subject, textbook_id, exam_type
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Create the Chunks Table (The "Brain" Storage)
-- No changes needed here, but included for completeness
create table if not exists textbook_chunks (
  id uuid default gen_random_uuid() primary key,
  textbook_id uuid references textbooks(id) on delete cascade,
  content text not null,
  embedding vector(768), 
  chunk_index int,
  metadata jsonb default '{}'::jsonb, -- Stores 'archetype', 'math_bias_score'
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Enable Vector Search
create index if not exists textbook_chunks_embedding_idx 
  on textbook_chunks using hnsw (embedding vector_cosine_ops);
