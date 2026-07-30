# JCRM - Just CRM

## Architecture Overview

This project uses a **single database architecture** with application-level tenant isolation - the industry standard for most SaaS applications.

### Database Structure

```sql
-- Single database: jcrm
users:          -- Authentication (template)
  └── id (UUID) ← Primary key
      email, hashed_password, is_active, ...

contacts:       -- CRM contacts (app)
  └── id (UUID)
      user_id ──┐
                ├── Foreign key to users.id
      name, email, ...

leads:          -- CRM leads (app)  
  └── id (UUID)
      user_id ──┐── Foreign key to users.id
      contact_id├── Foreign key to contacts.id (optional)
      source, status, score, ...

items:          -- CRM items (original template)
  └── id (UUID)
      owner_id ──┐
                ├── Foreign key to users.id
      title, description, ...

interactions:   -- CRM interactions (app)  
  └── id (UUID)
      user_id ──┐── Foreign key to users.id
      contact_id├── Foreign key to contacts.id
      lead_id   ├── Foreign key to leads.id (optional)
      type, timestamp, ...

reminders:      -- CRM reminders (app)
  └── id (UUID)
      user_id ──┐── Foreign key to users.id
      contact_id├── Foreign key to contacts.id
      lead_id   ├── Foreign key to leads.id (optional)
      message, remind_at, ...
```

### Tenant Isolation Pattern

```python
# Every query filters by user_id
class Lead(Base):
    __tablename__ = "leads"
    user_id = Column(UUID, ForeignKey("users.id"), nullable=False)
    contact_id = Column(UUID, ForeignKey("contacts.id"), nullable=True)
    name = Column(String)
    email = Column(String)
    source = Column(String)
    status = Column(String)  # lead, qualified, customer, lost
    score = Column(Integer, default=0)

# FastAPI dependency enforces isolation
@router.get("/leads")
def list_leads(
    current_user: User = Depends(get_current_user),  # From JWT token
    db: Session = Depends(get_db)
):
    # User can ONLY see their own leads
    return db.query(Lead).filter(
        Lead.user_id == current_user.id
    ).all()
```

### Lead Lifecycle Pipeline

**Stage 1: Lead Discovery**
- `source`: LinkedIn, website, referral, cold outreach
- `score`: Initial lead qualification (1-100)
- `contact_id`: Auto-link to existing contact when found

**Stage 2: Lead Qualification**
- `status`: lead → qualified → customer → churned
- `interactions`: Track conversations, emails, calls
- `reminders`: Follow-up scheduled automatically

**Stage 3: Customer Relationship**
- `status`: customer → advocate → lost
- `interactions`: Support, feedback, service requests
- `reminders`: Renewal reminders, check-ins

### Lead Segmentation & Assignment

```python
class LeadScoring:
    def __init__(self, linkedin_api, email_history):
        self.linkedin_api = linkedin_api
        self.email_history = email_history
    
    def calculate_score(self, lead):
        # Multiple factors for objective scoring
        linkedin_score = self._evaluate_linkedin_profile(lead.email)
        interaction_score = self._count_interactions(lead.id)
        timing_score = self._assess_timing(lead.created_at)
        
        total_score = (
            linkedin_score * 0.4 +
            interaction_score * 0.3 +
            timing_score * 0.3
        )
        
        return min(100, int(total_score))
```

### Why Single Database?

✅ **Industry Standard**: Used by Notion, Airtable, Slack  
✅ **Scalability**: Handles 10K-100K users easily  
✅ **Cost Effective**: Single PostgreSQL instance  
✅ **Simple Operations**: One backup, one monitoring target  
✅ **Relationship Context**: Complete history across all entities  

### Enterprise Alternative

For enterprise B2B with compliance needs:
```sql
 customer_a_db/    -- Per-customer database
 customer_b_db/    -- Sharded across instances
 customer_c_db/    -- Physical data separation
```

But for JCRM's SMB/personal use case, single database is perfect for maintaining relationship continuity.

## Multi-Tenancy Approaches

| Approach | Use Case | Example |
|----------|----------|---------|
| Single DB | SMB SaaS, Personal Apps | Notion, Airtable |
| Sharded DB | Enterprise B2B | Salesforce, Oracle |
| Hybrid | Growing SaaS | Stripe (new customers) |

## Security Model

1. **JWT Authentication** - Stateless, secure
2. **User Isolation** - Every query filtered by user_id
3. **No Direct ID Access** - Users can't access others' data
4. **Audit Trail** - All actions logged with user context
5. **Lead Access Control** - Users can only see/manage their own leads

## Relationship Intelligence Architecture

### Cross-Entity Relationships

```python
# Relationship graph enables intelligent features
# lead ← contact ← user
# lead → interactions → user  
# lead → reminders → user

@router.get("/relationships/{contact_id}")
def get_relationship_graph(
    contact_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Build complete relationship history
    contact = db.query(Contact).filter(
        Contact.id == contact_id,
        Contact.user_id == current_user.id
    ).first()
    
    if not contact:
        raise HTTPException(status_code=404)
    
    # Get all interactions with this contact
    interactions = db.query(Interaction).filter(
        Interaction.contact_id == contact_id,
        Interaction.user_id == current_user.id
    ).all()
    
    # Get related leads
    leads = db.query(Lead).filter(
        Lead.contact_id == contact_id,
        Lead.user_id == current_user.id
    ).all()
    
    return {
        "contact": contact,
        "interactions": interactions,
        "leads": leads,
        "timeline": self.build_timeline(interactions, leads)
    }
```

## Deployment

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for Kubernetes and Docker deployment instructions.