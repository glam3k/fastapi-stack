from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models import Contact, ContactCreate
from tests.utils.user import authentication_token_from_email
from tests.utils.utils import random_email, random_string


def test_create_contact(db: Session, client: TestClient, normal_user_token_headers: dict[str, str]) -> None:
    """
    Test creating a contact.
    """
    email = random_email()
    name = random_string(10)
    contact_in = ContactCreate(
        name=name,
        email=email,
        category="professional",
        tags=["colleague", "networking"],
        relationship_strength=500,
    )

    response = client.post(
        "api/v1/users/contacts/",
        headers=normal_user_token_headers,
        json=contact_in.model_dump(),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == contact_in.name
    assert data["email"] == contact_in.email
    assert data["user_id"] == normal_user_token_headers.get("user_id")


def test_create_contact_duplicate_email(db: Session, client: TestClient, normal_user_token_headers: dict[str, str]) -> None:
    """
    Test creating a contact with duplicate email should fail.
    """
    email = random_email()
    name = random_string(10)
    contact_in = ContactCreate(
        name=name,
        email=email,
        category="professional",
        tags=["colleague"],
        relationship_strength=500,
    )

    # First contact creation should succeed
    response = client.post(
        "api/v1/users/contacts/",
        headers=normal_user_token_headers,
        json=contact_in.model_dump(),
    )
    assert response.status_code == 200

    # Second contact with same email should fail
    response = client.post(
        "api/v1/users/contacts/",
        headers=normal_user_token_headers,
        json=contact_in.model_dump(),
    )
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


def test_read_contact(db: Session, client: TestClient, normal_user_token_headers: dict[str, str]) -> None:
    """
    Test reading a contact.
    """
    email = random_email()
    name = random_string(10)
    contact_in = ContactCreate(
        name=name,
        email=email,
        category="professional",
        tags=["colleague"],
        relationship_strength=500,
    )

    response = client.post(
        "api/v1/users/contacts/",
        headers=normal_user_token_headers,
        json=contact_in.model_dump(),
    )
    assert response.status_code == 200
    contact_data = response.json()
    contact_id = contact_data["id"]

    # Read the contact by id
    response = client.get(
        f"api/v1/users/contacts/{contact_id}",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == name
    assert data["email"] == email


def test_read_contacts(db: Session, client: TestClient, normal_user_token_headers: dict[str, str]) -> None:
    """
    Test reading multiple contacts.
    """
    name1 = random_string(10)
    email1 = random_email()
    contact1 = ContactCreate(
        name=name1,
        email=email1,
        category="professional",
        tags=["colleague"],
        relationship_strength=600,
    )

    name2 = random_string(10)
    email2 = random_email()
    contact2 = ContactCreate(
        name=name2,
        email=email2,
        category="personal",
        tags=["friend"],
        relationship_strength=400,
    )

    # Create first contact
    response = client.post(
        "api/v1/users/contacts/",
        headers=normal_user_token_headers,
        json=contact1.model_dump(),
    )
    assert response.status_code == 200

    # Create second contact
    response = client.post(
        "api/v1/users/contacts/",
        headers=normal_user_token_headers,
        json=contact2.model_dump(),
    )
    assert response.status_code == 200

    # Read all contacts
    response = client.get(
        "api/v1/users/contacts/",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 2
    assert len(data["data"]) == 2
    assert {c["name"] for c in data["data"]} == {name1, name2}


def test_update_contact(db: Session, client: TestClient, normal_user_token_headers: dict[str, str]) -> None:
    """
    Test updating a contact.
    """
    email = random_email()
    name = random_string(10)
    contact_in = ContactCreate(
        name=name,
        email=email,
        category="professional",
        tags=["colleague"],
        relationship_strength=500,
    )

    response = client.post(
        "api/v1/users/contacts/",
        headers=normal_user_token_headers,
        json=contact_in.model_dump(),
    )
    assert response.status_code == 200
    contact_id = response.json()["id"]

    # Update the contact
    update_data = {
        "name": "Updated Name",
        "phone": "123-456-7890",
        "relationship_strength": 750,
    }
    response = client.put(
        f"api/v1/users/contacts/{contact_id}",
        headers=normal_user_token_headers,
        json=update_data,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Name"
    assert data["phone"] == "123-456-7890"
    assert data["relationship_strength"] == 750


def test_delete_contact(db: Session, client: TestClient, normal_user_token_headers: dict[str, str]) -> None:
    """
    Test deleting a contact.
    """
    email = random_email()
    name = random_string(10)
    contact_in = ContactCreate(
        name=name,
        email=email,
        category="professional",
        tags=["colleague"],
        relationship_strength=500,
    )

    response = client.post(
        "api/v1/users/contacts/",
        headers=normal_user_token_headers,
        json=contact_in.model_dump(),
    )
    assert response.status_code == 200
    contact_id = response.json()["id"]

    # Delete the contact
    response = client.delete(
        f"api/v1/users/contacts/{contact_id}",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Contact deleted successfully"


def test_access_contact_owned_by_another_user(db: Session, client: TestClient, normal_user_token_headers: dict[str, str]) -> None:
    """
    Test that users cannot access contacts owned by other users.
    """
    # Create first user
    user1_response = client.post(
        "api/v1/users/signup",
        json={
            "email": random_email(),
            "password": "password",
            "full_name": "User 1",
        },
    )
    assert user1_response.status_code == 200

    # Create second user
    user2_response = client.post(
        "api/v1/users/signup",
        json={
            "email": random_email(),
            "password": "password",
            "full_name": "User 2",
        },
    )
    assert user2_response.status_code == 200

    # Create contact as first user
    contact_in = ContactCreate(
        name="Contact 1",
        email=random_email(),
        category="professional",
        tags=["colleague"],
        relationship_strength=500,
    )
    response1 = client.post(
        "api/v1/users/contacts/",
        headers={"Authorization": f"Bearer {user1_response.json()['access_token']}"},
        json=contact_in.model_dump(),
    )
    assert response1.status_code == 200
    contact1_id = response1.json()["id"]

    # Second user tries to access first user's contact - should fail
    response2 = client.get(
        f"api/v1/users/contacts/{contact1_id}",
        headers={"Authorization": f"Bearer {user2_response.json()['access_token']}"},
    )
    assert response2.status_code == 403

