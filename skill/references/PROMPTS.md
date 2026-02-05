# Analysis Pipeline Prompts

Reference prompts for each step of the document analysis pipeline.

---

## 1. OCR Extraction Prompt

```
You are analyzing a document from the DOJ Epstein Library. Extract ALL text from this document.

Requirements:
1. Preserve reading order (top-to-bottom, left-to-right for columns)
2. Include ALL text: headers, footers, page numbers, stamps, handwritten notes
3. For tables, preserve structure using | separators
4. Mark redacted sections as [REDACTED]
5. Mark illegible sections as [ILLEGIBLE]
6. Include document metadata if visible (dates, case numbers, etc.)

Format the output as plain text, preserving paragraph breaks.
```

---

## 2. Entity Extraction Prompt

```
Extract all entities from this document text. For each entity, identify:

ENTITY TYPES:
- person: Named individuals (full names, partial names, nicknames)
- organization: Companies, institutions, government agencies
- location: Physical addresses, properties, cities, countries
- date: Specific dates, date ranges, time periods
- financial: Money amounts, account numbers, transaction references
- event: Named events, investigations, legal proceedings
- vehicle: Aircraft, boats, cars with identifying information
- document_reference: References to other documents, exhibits

For each entity provide:
{
  "name": "exact text as it appears",
  "type": "entity type from above",
  "role": "their role in this document context or null",
  "confidence": 0.0-1.0,
  "spans": [{"start": character_position, "end": character_position}]
}

Confidence guidelines:
- 0.9-1.0: Clear, unambiguous identification
- 0.7-0.9: High confidence with minor ambiguity
- 0.5-0.7: Moderate confidence, some uncertainty
- 0.3-0.5: Low confidence, significant ambiguity
- <0.3: Very uncertain, include only if potentially important

Extract comprehensively - include all entities even if they seem minor.
```

---

## 3. Relationship Extraction Prompt

```
Analyze the extracted entities and document text to identify relationships.

RELATIONSHIP TYPES:
- MET_WITH: Direct evidence of physical meeting
- TRAVELED_WITH: Co-traveled (flight logs, travel records)
- EMPLOYED_BY: Employment or contractor relationship
- PAID: Financial payment from source to target
- RECEIVED_PAYMENT: Target received payment from source
- ASSOCIATED_WITH: Documented association or connection
- RELATED_TO: Family or personal relationship
- LOCATED_AT: Person/organization's presence at location
- OWNS: Ownership of property, company, asset
- MENTIONED_WITH: Co-mentioned without stronger relationship

For each relationship:
{
  "sourceEntity": "entity name as extracted",
  "targetEntity": "entity name as extracted",
  "relationshipType": "type from above",
  "confidence": 0.0-1.0,
  "evidenceText": "direct quote supporting this relationship (max 500 chars)"
}

CRITICAL DISTINCTIONS:
- FACT: Directly stated in sworn testimony, court records, verified documents
- ALLEGATION: Claims made by parties, not independently verified
- INFERENCE: Logical conclusion from multiple pieces of evidence

Adjust confidence:
- Facts: 0.8-1.0
- Allegations: 0.5-0.7
- Inferences: 0.3-0.5

Always include evidenceText - no relationship without supporting text.
```

---

## 4. Summary Generation Prompt

```
Generate a comprehensive summary of this document.

1. TLDR (max 150 characters):
Write one sentence capturing the most important aspect of this document.
Focus on: Who? What? When? Why does it matter?

2. DETAILED SUMMARY (2-3 paragraphs):
Paragraph 1: Document type and context
- What kind of document is this?
- When was it created?
- What proceeding is it part of?

Paragraph 2: Key content
- Main information revealed
- Important people mentioned
- Significant dates and locations

Paragraph 3: Significance
- What does this add to the investigation?
- Any surprising revelations?
- Connections to other known information

3. KEY TOPICS (3-7 tags):
Choose from or create tags like:
flight-logs, victim-testimony, financial-transactions, property-records,
recruitment, trafficking, witness-statements, legal-proceedings,
media-coverage, law-enforcement, political-connections, celebrity-connections

4. DOCUMENT TYPE:
deposition | court_filing | flight_log | financial_record | correspondence |
police_report | media_coverage | tip | other

5. DATE RANGE:
Format as "YYYY-MM-DD to YYYY-MM-DD" or "YYYY" or "Unknown"
This is the time period the document covers, not when it was created.

6. SIGNIFICANCE:
2-3 sentences on why this document matters to the investigation.

Write for a general audience. Avoid legal jargon. Be factual and objective.
```

---

## 5. Credibility Scoring Prompt

```
Assess the credibility of this document on a scale of 0.0 to 1.0.

SCORING GUIDE:
0.85-0.95: Court records, sworn testimony under penalty of perjury
0.80-0.90: Official law enforcement reports, government documents
0.75-0.85: Verified financial records, authenticated documents
0.60-0.75: Personal correspondence, internal memos
0.50-0.70: News articles from reputable sources
0.30-0.50: Tips, anonymous sources, unverified claims
0.10-0.30: Questionable provenance, potentially fabricated

ADJUSTMENTS:
+0.05: Document authenticated/certified
+0.05: Corroborated by other sources
-0.05: Document quality issues (faded, partial)
-0.10: Contradicted by other evidence
-0.10: Source has known credibility issues

Provide your score with brief justification.
```

---

## 6. Spice Rating Prompt

```
Rate this document's investigative significance from 1 to 5.

RATING SCALE:
1 - ROUTINE
- Administrative documents
- Standard legal procedures
- No new information

2 - NOTABLE
- Contains useful background information
- Provides context for other documents
- Minor new details

3 - INTERESTING
- Reveals previously unknown details
- Establishes new connections
- Clarifies timeline or relationships

4 - SIGNIFICANT
- Major new revelation
- Important evidence
- Changes understanding of events

5 - MAJOR
- Bombshell information
- Critical evidence
- Fundamentally changes the case

BE CONSERVATIVE:
- Most documents should be rated 2-3
- Rating 4 should be rare
- Rating 5 should be exceptional

Ask yourself: "Would a journalist write a story based solely on this document?"
- No → 1-2
- Maybe with other context → 3
- Yes, it's newsworthy → 4
- It would be front-page news → 5

Provide your rating with brief justification.
```

---

## Combined Analysis Prompt

For efficient single-pass analysis:

```
Analyze this document from the DOJ Epstein Library. Provide a complete structured analysis.

DOCUMENT TEXT:
{full_text}

Provide your analysis in the following JSON structure:

{
  "entities": [
    {"name": "", "type": "", "role": null, "confidence": 0.0, "spans": []}
  ],
  "relationships": [
    {"sourceEntity": "", "targetEntity": "", "relationshipType": "", "confidence": 0.0, "evidenceText": ""}
  ],
  "summary": {
    "tldr": "",
    "detailed": "",
    "keyTopics": [],
    "documentType": "",
    "dateRange": "",
    "significance": ""
  },
  "credibilityScore": 0.0,
  "spiceRating": 0
}

Entity types: person, organization, location, date, financial, event, vehicle, document_reference
Relationship types: MET_WITH, TRAVELED_WITH, EMPLOYED_BY, PAID, RECEIVED_PAYMENT, ASSOCIATED_WITH, RELATED_TO, LOCATED_AT, OWNS, MENTIONED_WITH
Document types: deposition, court_filing, flight_log, financial_record, correspondence, police_report, media_coverage, tip, other

Be thorough with entities, conservative with spice ratings, and always include evidence for relationships.
```
