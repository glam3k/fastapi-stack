import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import cast, text
from sqlalchemy import String as SAString
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import Item, ItemCreate, ItemPublic, ItemsPublic, ItemUpdate, Message, get_datetime_utc

router = APIRouter(prefix="/items", tags=["items"])


class TagCount(BaseModel):
    name: str
    count: int


@router.get("/tags/", response_model=list[TagCount])
def read_item_tags(
    session: SessionDep, current_user: CurrentUser,
) -> Any:
    """
    Get all unique tags for the current user's items with counts.
    """
    stmt = text("""
        SELECT t.tag AS name, COUNT(*) AS count
        FROM item, jsonb_array_elements_text(tags::jsonb) AS t(tag)
        WHERE owner_id = :user_id
        GROUP BY t.tag
        ORDER BY count DESC
    """)
    result = session.execute(stmt, {"user_id": str(current_user.id)})
    return [{"name": row[0], "count": row[1]} for row in result]


@router.get("/", response_model=ItemsPublic)
def read_items(
    session: SessionDep, current_user: CurrentUser,
    skip: int = 0, limit: int = 100,
    search: str | None = None,
    tag: str | None = None,
) -> Any:
    """
    Retrieve items with optional search and tag filtering.
    """

    if current_user.is_superuser:
        base_conditions: list = []
    else:
        base_conditions = [Item.owner_id == current_user.id]

    if search:
        s = f"%{search}%"
        base_conditions.append(
            col(Item.title).ilike(s)
            | col(Item.description).ilike(s)
            | cast(Item.tags, SAString).ilike(s)
        )

    if tag:
        base_conditions.append(
            cast(Item.tags, SAString).contains(f'"{tag}"')
        )

    count_statement = select(func.count()).select_from(Item).where(*base_conditions)
    count = session.exec(count_statement).one()

    statement = (
        select(Item)
        .where(*base_conditions)
        .order_by(col(Item.created_at).desc())
        .offset(skip)
        .limit(limit)
    )
    items = session.exec(statement).all()

    items_public = [ItemPublic.model_validate(item) for item in items]
    return ItemsPublic(data=items_public, count=count)


@router.get("/{id}", response_model=ItemPublic)
def read_item(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    """
    Get item by ID.
    """
    item = session.get(Item, id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if not current_user.is_superuser and (item.owner_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return item


@router.post("/", response_model=ItemPublic)
def create_item(
    *, session: SessionDep, current_user: CurrentUser, item_in: ItemCreate
) -> Any:
    """
    Create new item.
    """
    item = Item.model_validate(item_in, update={"owner_id": current_user.id})
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@router.put("/{id}", response_model=ItemPublic)
def update_item(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    item_in: ItemUpdate,
) -> Any:
    """
    Update an item.
    """
    item = session.get(Item, id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if not current_user.is_superuser and (item.owner_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    update_dict = item_in.model_dump(exclude_unset=True)
    update_dict["updated_at"] = get_datetime_utc()
    item.sqlmodel_update(update_dict)
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@router.delete("/{id}")
def delete_item(
    session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Message:
    """
    Delete an item.
    """
    item = session.get(Item, id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if not current_user.is_superuser and (item.owner_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    session.delete(item)
    session.commit()
    return Message(message="Item deleted successfully")
