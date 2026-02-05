-- OpenClaw Investigations Database Schema
-- PostgreSQL with pgvector extension

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector";

-- agents: Registered processing agents
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_key VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255),
    tasks_completed INTEGER DEFAULT 0 NOT NULL,
    points_balance INTEGER DEFAULT 0 NOT NULL,
    consensus_rate DECIMAL(5,4) DEFAULT 0 NOT NULL,
    status VARCHAR(20) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- documents: Source documents from DOJ, FBI, etc.
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hash VARCHAR(64) UNIQUE NOT NULL,
    source VARCHAR(50) NOT NULL,
    source_url TEXT,
    r2_key VARCHAR(500) NOT NULL,
    file_name VARCHAR(500),
    file_type VARCHAR(20) NOT NULL,
    file_size_bytes INTEGER,
    page_count INTEGER,
    processing_status VARCHAR(20) DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- tasks: Atomic units of work
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id),
    task_type VARCHAR(30) NOT NULL,
    status VARCHAR(20) DEFAULT 'AVAILABLE' NOT NULL,
    priority INTEGER DEFAULT 100 NOT NULL,
    claimed_by UUID REFERENCES agents(id),
    claim_expires_at TIMESTAMP WITH TIME ZONE,
    required_submissions INTEGER DEFAULT 2 NOT NULL,
    submission_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- task_submissions: Agent analysis results
CREATE TABLE task_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id),
    agent_id UUID NOT NULL REFERENCES agents(id),
    full_text TEXT,
    entities JSONB DEFAULT '[]'::jsonb NOT NULL,
    relationships JSONB DEFAULT '[]'::jsonb NOT NULL,
    summary JSONB,
    credibility_score DECIMAL(3,2),
    spice_rating INTEGER,
    processing_metadata JSONB,
    validation_status VARCHAR(20) DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(task_id, agent_id)
);

-- entities: Resolved entities across documents
CREATE TABLE entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canonical_name VARCHAR(500) NOT NULL,
    entity_type VARCHAR(30) NOT NULL,
    aliases TEXT[] DEFAULT '{}' NOT NULL,
    metadata JSONB DEFAULT '{}' NOT NULL,
    name_embedding VECTOR(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- entity_relationships: Connections between entities
CREATE TABLE entity_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_entity_id UUID NOT NULL REFERENCES entities(id),
    target_entity_id UUID NOT NULL REFERENCES entities(id),
    relationship_type VARCHAR(30) NOT NULL,
    confidence DECIMAL(3,2) NOT NULL,
    evidence_text TEXT NOT NULL,
    document_id UUID NOT NULL REFERENCES documents(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- document_entities: Junction table for document-entity relationships
CREATE TABLE document_entities (
    document_id UUID NOT NULL REFERENCES documents(id),
    entity_id UUID NOT NULL REFERENCES entities(id),
    role VARCHAR(255),
    confidence DECIMAL(3,2) NOT NULL,
    spans JSONB DEFAULT '[]' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    PRIMARY KEY (document_id, entity_id)
);

-- document_summaries: Validated merged results
CREATE TABLE document_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL UNIQUE REFERENCES documents(id),
    full_text TEXT,
    tldr TEXT,
    detailed_summary TEXT,
    key_topics TEXT[] DEFAULT '{}' NOT NULL,
    document_type VARCHAR(100),
    date_range VARCHAR(100),
    significance TEXT,
    spice_rating INTEGER,
    credibility_score DECIMAL(3,2),
    summary_embedding VECTOR(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_documents_source ON documents(source);
CREATE INDEX idx_documents_processing_status ON documents(processing_status);
CREATE INDEX idx_documents_hash ON documents(hash);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_claimed_by ON tasks(claimed_by);
CREATE INDEX idx_tasks_document_id ON tasks(document_id);

CREATE INDEX idx_task_submissions_task_id ON task_submissions(task_id);
CREATE INDEX idx_task_submissions_agent_id ON task_submissions(agent_id);

CREATE INDEX idx_entities_canonical_name ON entities(canonical_name);
CREATE INDEX idx_entities_entity_type ON entities(entity_type);
CREATE INDEX idx_entities_canonical_name_trgm ON entities USING gin (canonical_name gin_trgm_ops);

CREATE INDEX idx_entity_relationships_source ON entity_relationships(source_entity_id);
CREATE INDEX idx_entity_relationships_target ON entity_relationships(target_entity_id);
CREATE INDEX idx_entity_relationships_type ON entity_relationships(relationship_type);

CREATE INDEX idx_document_entities_entity_id ON document_entities(entity_id);

-- Vector similarity indexes (for semantic search)
CREATE INDEX idx_entities_name_embedding ON entities USING ivfflat (name_embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_document_summaries_embedding ON document_summaries USING ivfflat (summary_embedding vector_cosine_ops) WITH (lists = 100);
