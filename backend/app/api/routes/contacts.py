import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import cast, or_, text
from sqlalchemy import String as SAString
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.core.io_utils import export_json, export_csv, parse_import_data
from app.models import (
    Contact,
    ContactCreate,
    ContactPublic,
    ContactsPublic,
    ContactUpdate,
    Message,
    BulkUpdateRequest,
    BulkExportRequest,
)

router = APIRouter(prefix="/contacts", tags=["contacts"])


class TagCount(BaseModel):
    name: str
    count: int


@router.get("/tags/", response_model=list[TagCount])
def read_tags(
    session: SessionDep, current_user: CurrentUser,
) -> Any:
    """
    Get all unique tags for the current user with counts.
    """
    stmt = text("""
        SELECT t.tag AS name, COUNT(*) AS count
        FROM contact, jsonb_array_elements_text(tags::jsonb) AS t(tag)
        WHERE user_id = :user_id
        GROUP BY t.tag
        ORDER BY count DESC
    """)
    result = session.execute(stmt, {"user_id": str(current_user.id)})
    return [{"name": row[0], "count": row[1]} for row in result]



@router.get("/", response_model=ContactsPublic)
def read_contacts(
    session: SessionDep, current_user: CurrentUser,
    skip: int = 0, limit: int = 100,
    search: str | None = None,
    tag: str | None = None,
) -> Any:
    """
    Retrieve contacts for current user.
    Supports search (substring across name, email, phone, category, tags, notes)
    and tag filtering.
    """

    if current_user.is_superuser:
        base_conditions: list = []
    else:
        base_conditions = [Contact.user_id == current_user.id]

    if search:
        s = f"%{search}%"
        base_conditions.append(
            col(Contact.name).ilike(s)
            | col(Contact.email).ilike(s)
            | col(Contact.phone).ilike(s)
            | col(Contact.category).ilike(s)
            | Contact.notes.ilike(s)
            | cast(Contact.tags, SAString).ilike(s)
        )

    if tag:
        base_conditions.append(
            cast(Contact.tags, SAString).contains(f'"{tag}"')
        )

    count_statement = select(func.count()).select_from(Contact).where(*base_conditions)
    count = session.exec(count_statement).one()

    statement = (
        select(Contact)
        .where(*base_conditions)
        .order_by(col(Contact.created_at).desc())
        .offset(skip)
        .limit(limit)
    )
    contacts = session.exec(statement).all()

    contacts_public = [ContactPublic.model_validate(contact) for contact in contacts]
    return ContactsPublic(data=contacts_public, count=count)


@router.get("/{id}", response_model=ContactPublic)
def read_contact(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    """
    Get contact by ID.
    """
    contact = session.get(Contact, id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    if not current_user.is_superuser and (contact.user_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return contact


@router.post("/", response_model=ContactPublic)
def create_contact(
    *, session: SessionDep, current_user: CurrentUser, contact_in: ContactCreate
) -> Any:
    """
    Create new contact.
    """
    # Check if contact with same email already exists for this user (only if email is provided)
    if contact_in.email:
        existing_contact = session.exec(
            select(Contact).where(
                Contact.email == contact_in.email,
                Contact.user_id == current_user.id
            )
        ).first()
        if existing_contact:
            raise HTTPException(
                status_code=400,
                detail="Contact with this email already exists for the current user.",
            )

    contact_data = contact_in.model_dump()
    contact_data["user_id"] = current_user.id
    contact = Contact.model_validate(contact_data)
    session.add(contact)
    session.commit()
    session.refresh(contact)
    return contact


@router.put("/{id}", response_model=ContactPublic)
def update_contact(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    contact_in: ContactUpdate,
) -> Any:
    """
    Update a contact.
    """
    contact = session.get(Contact, id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    if not current_user.is_superuser and (contact.user_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    update_dict = contact_in.model_dump(exclude_unset=True)
    contact.sqlmodel_update(update_dict)
    session.add(contact)
    session.commit()
    session.refresh(contact)
    return contact


@router.delete("/bulk")
def bulk_delete_contacts(
    *, session: SessionDep, current_user: CurrentUser, ids: list[uuid.UUID]
) -> Message:
    """
    Delete multiple contacts.
    """
    deleted_count = 0
    for id in ids:
        contact = session.get(Contact, id)
        if contact:
            if current_user.is_superuser or contact.user_id == current_user.id:
                session.delete(contact)
                deleted_count += 1
            else:
                raise HTTPException(status_code=403, detail=f"Not enough permissions for id: {id}")
    session.commit()
    return Message(message=f"{deleted_count} contacts deleted successfully")


@router.post("/bulk-export")
def export_contacts(
    *, session: SessionDep, current_user: CurrentUser, request: BulkExportRequest
) -> Any:
    """
    Export contacts as CSV or JSON.
    """
    query = select(Contact)
    if request.ids:
        query = query.where(Contact.id.in_(request.ids))
    query = query.where(
        Contact.user_id == current_user.id
    ).order_by(Contact.created_at.desc())

    contacts = session.exec(query).all()
    if not contacts:
        raise HTTPException(status_code=404, detail="No contacts found to export")

    if request.format == "json":
        return export_json(contacts)

    elif request.format == "csv":
        return export_csv(contacts)

    else:
        raise HTTPException(status_code=400, detail="Invalid export format")


@router.post("/import/")
def import_contacts(
    *, session: SessionDep, current_user: CurrentUser, file: UploadFile
) -> Any:
    """
    Import contacts from a CSV or JSON file.
    """
    content = file.file.read().decode("utf-8")
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename else "json"
    fmt = "csv" if ext == "csv" else "json"

    try:
        rows = parse_import_data(content, fmt)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {e}")

    created = []
    errors = []

    for i, row in enumerate(rows, start=1):
        try:
            if "name" not in row or not row["name"]:
                errors.append({"row": i, "error": "Name is required"})
                continue
            contact_in = ContactCreate(**{k: v for k, v in row.items() if k in ContactCreate.model_fields})
            contact = Contact(**contact_in.model_dump(), user_id=current_user.id)
            session.add(contact)
            session.flush()
            created.append(ContactPublic.model_validate(contact))
        except Exception as e:
            errors.append({"row": i, "error": str(e)})

    session.commit()

    return {
        "created": len(created),
        "contacts": [c.model_dump() for c in created],
        "errors": errors,
    }


@router.patch("/bulk-update")
def bulk_update_contacts(
    *, session: SessionDep, current_user: CurrentUser, update_request: BulkUpdateRequest
) -> Message:
    """
    Update multiple contacts.
    """
    updated_count = 0
    errors = []
    
    for contact_id in update_request.ids:
        contact = session.get(Contact, contact_id)
        if not contact:
            errors.append(f"Contact not found: {contact_id}")
            continue
        if not current_user.is_superuser and (contact.user_id != current_user.id):
            errors.append(f"Not enough permissions for contact id: {contact_id}")
            continue
        
        update_dict = update_request.data.model_dump(exclude_unset=True)
        if not update_dict:
            continue
        
        contact.sqlmodel_update(update_dict)
        updated_count += 1
    
    if errors:
        raise HTTPException(status_code=400, detail="; ".join(errors))
    
    session.commit()
    return Message(message=f"{updated_count} contacts updated successfully")


@router.delete("/{id}")
def delete_contact(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Message:
    """
    Delete a contact.
    """
    contact = session.get(Contact, id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    if not current_user.is_superuser and (contact.user_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    session.delete(contact)
    session.commit()
    return Message(message="Contact deleted successfully")
