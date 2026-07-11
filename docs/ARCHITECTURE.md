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

interactions:   -- CRM interactions (app)  
  └── id (UUID)
      user_id ──┐── Foreign key to users.id
      contact_id├── Foreign key to contacts.id
      type, timestamp, ...

reminders:      -- CRM reminders (app)
  └── id (UUID)
      user_id ──┐── Foreign key to users.id
      contact_id├── Foreign key to contacts.id
      message, remind_at, ...
```

### Tenant Isolation Pattern

```python
# Every query filters by user_id
class Contact(Base):
    __tablename__ = "contacts"
    user_id = Column(UUID, ForeignKey("users.id"), nullable=False)
    name = Column(String)
    email = Column(String)

# FastAPI dependency enforces isolation
@router.get("/contacts")
def list_contacts(
    current_user: User = Depends(get_current_user),  # From JWT token
    db: Session = Depends(get_db)
):
    # User can ONLY see their own contacts
    return db.query(Contact).filter(
        Contact.user_id == current_user.id
    ).all()
```

### Why Single Database?

✅ **Industry Standard**: Used by Notion, Airtable, Slack  
✅ **Scalability**: Handles 10K-100K users easily  
✅ **Cost Effective**: Single PostgreSQL instance  
✅ **Simple Operations**: One backup, one monitoring target  

### Enterprise Alternative

For enterprise B2B with compliance needs:
```sql
customer_a_db/    -- Per-customer database
customer_b_db/    -- Sharded across instances
customer_c_db/    -- Physical data separation
```

But for JCRM's SMB/personal use case, single database is perfect.

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

## Deployment

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for Kubernetes and Docker deployment instructions.