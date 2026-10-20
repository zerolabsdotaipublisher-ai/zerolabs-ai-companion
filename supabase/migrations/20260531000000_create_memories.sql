-- Create memories table
CREATE TABLE memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    capture_id UUID NOT NULL UNIQUE REFERENCES captures(id) ON DELETE CASCADE,
    suggestion_id UUID NULL REFERENCES daily_suggestions(id) ON DELETE SET NULL,
    summary_text TEXT NOT NULL,
    media_metadata_ref JSONB NULL DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Add query performance indexes
CREATE INDEX idx_memories_user_id_created_at ON memories(user_id, created_at DESC);
CREATE UNIQUE INDEX idx_memories_capture_id ON memories(capture_id);
CREATE INDEX idx_memories_suggestion_id ON memories(suggestion_id) WHERE suggestion_id IS NOT NULL;

-- Configure Row Level Security (RLS)
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own memories"
    ON memories FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memories"
    ON memories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memories"
    ON memories FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memories"
    ON memories FOR DELETE
    USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_memories_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_memories_updated_at
    BEFORE UPDATE ON memories
    FOR EACH ROW
    EXECUTE FUNCTION update_memories_updated_at_column();
