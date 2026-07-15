import uuid
from typing import Any

from sqlmodel import Session, col, func, select

from app.core.security import get_password_hash, verify_password
from app.models import (
    Contact,
    ContactCreate,
    ContactPublic,
    ContactsPublic,
    ContactUpdate,
    Item,
    ItemCreate,
    User,
    UserCreate,
    UserUpdate,
)


def create_user(*, session: Session, user_create: UserCreate) -> User:
    db_obj = User.model_validate(
        user_create, update={"hashed_password": get_password_hash(user_create.password)}
    )
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def update_user(*, session: Session, db_user: User, user_in: UserUpdate) -> Any:
    user_data = user_in.model_dump(exclude_unset=True)
    extra_data = {}
    if "password" in user_data:
        password = user_data["password"]
        hashed_password = get_password_hash(password)
        extra_data["hashed_password"] = hashed_password
    db_user.sqlmodel_update(user_data, update=extra_data)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user


def get_user_by_email(*, session: Session, email: str) -> User | None:
    statement = select(User).where(User.email == email)
    session_user = session.exec(statement).first()
    return session_user


DUMMY_HASH = "$argon2id$v=19$m=65536,t=3,p=4$MjQyZWE1MzBjYjJlZTI0Yw$YTU4NGM5ZTZmYjE2NzZlZjY0ZWY3ZGRkY2U2OWFjNjk"


def authenticate(*, session: Session, email: str, password: str) -> User | None:
    db_user = get_user_by_email(session=session, email=email)
    if not db_user:
        verify_password(password, DUMMY_HASH)
        return None
    verified, updated_password_hash = verify_password(password, db_user.hashed_password)
    if not verified:
        return None
    if updated_password_hash:
        db_user.hashed_password = updated_password_hash
        session.add(db_user)
        session.commit()
        session.refresh(db_user)
    return db_user


def create_item(*, session: Session, item_in: ItemCreate, owner_id: uuid.UUID) -> Item:
    db_item = Item.model_validate(item_in, update={"owner_id": owner_id})
    session.add(db_item)
    session.commit()
    session.refresh(db_item)
    return db_item


def create_contact(*, session: Session, contact_in: ContactCreate, user_id: uuid.UUID) -> Contact:
    contact_data = contact_in.model_dump()
    contact_data["user_id"] = user_id
    db_obj = Contact.model_validate(contact_data)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def update_contact(*, session: Session, db_contact: Contact, contact_in: ContactUpdate) -> Any:
    contact_data = contact_in.model_dump(exclude_unset=True)
    db_contact.sqlmodel_update(contact_data)
    session.add(db_contact)
    session.commit()
    session.refresh(db_contact)
    return db_contact


def get_contact_by_email_and_user(*, session: Session, email: str, user_id: uuid.UUID) -> Contact | None:
    statement = select(Contact).where(
        Contact.email == email,
        Contact.user_id == user_id
    )
    return session.exec(statement).first()


def read_contacts(session: Session, user_id: uuid.UUID, skip: int = 0, limit: int = 100) -> ContactsPublic:
    count_statement = (
        select(func.count())
        .select_from(Contact)
        .where(Contact.user_id == user_id)
    )
    count = session.exec(count_statement).one()

    statement = (
        select(Contact)
        .where(Contact.user_id == user_id)
        .order_by(col(Contact.created_at).desc())
        .offset(skip)
        .limit(limit)
    )
    contacts = session.exec(statement).all()

    contacts_public = [ContactPublic.model_validate(contact) for contact in contacts]
    return ContactsPublic(data=contacts_public, count=count)
