export type EntityType =
  | 'person'
  | 'organization'
  | 'location'
  | 'date'
  | 'financial'
  | 'event'
  | 'vehicle'
  | 'document_reference';

export interface Entity {
  id: string;
  canonicalName: string;
  entityType: EntityType;
  aliases: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface EntityMention {
  name: string;
  type: EntityType;
  role: string | null;
  confidence: number;
  spans: Array<{ start: number; end: number }>;
}

export interface EntityProfile extends Entity {
  documentCount: number;
  relationshipCount: number;
  firstSeen: Date | null;
  lastSeen: Date | null;
}

export type RelationshipType =
  | 'MET_WITH'
  | 'TRAVELED_WITH'
  | 'EMPLOYED_BY'
  | 'PAID'
  | 'RECEIVED_PAYMENT'
  | 'ASSOCIATED_WITH'
  | 'RELATED_TO'
  | 'LOCATED_AT'
  | 'OWNS'
  | 'MENTIONED_WITH';

export interface Relationship {
  sourceEntity: string;
  targetEntity: string;
  relationshipType: RelationshipType;
  confidence: number;
  evidenceText: string;
  documentId: string;
}

export interface EntityRelationship {
  id: string;
  sourceEntityId: string;
  targetEntityId: string;
  relationshipType: RelationshipType;
  confidence: number;
  evidenceText: string;
  documentId: string;
  createdAt: Date;
}

export interface EntityGraphNode {
  id: string;
  name: string;
  type: EntityType;
  documentCount: number;
}

export interface EntityGraphEdge {
  source: string;
  target: string;
  type: RelationshipType;
  weight: number;
}

export interface EntityGraph {
  nodes: EntityGraphNode[];
  edges: EntityGraphEdge[];
}
