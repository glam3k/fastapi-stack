from fastapi.testclient import TestClient

from app.models import ContactCreate
from tests.utils.utils import random_email, random_lower_string


def test_create_contact(client: TestClient, normal_user_token_headers: dict[str, str]) -> None:
    """
    Test creating a contact.
    """
    email = random_email()
    name = random_lower_string()
    contact_in = ContactCreate(
        name=name,
        email=email,
        category="professional",
        tags=["colleague", "networking"],
        relationship_strength=500,
    )

    response = client.post(
        "api/v1/contacts/",
        headers=normal_user_token_headers,
        json=contact_in.model_dump(),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == contact_in.name
    assert data["email"] == contact_in.email
    assert "user_id" in data


def test_create_contact_duplicate_email(client: TestClient, normal_user_token_headers: dict[str, str]) -> None:
    """
    Test creating a contact with duplicate email should fail.
    """
    email = random_email()
    name = random_lower_string()
    contact_in = ContactCreate(
        name=name,
        email=email,
        category="professional",
        tags=["colleague"],
        relationship_strength=500,
    )

    # First contact creation should succeed
    response = client.post(
        "api/v1/contacts/",
        headers=normal_user_token_headers,
        json=contact_in.model_dump(),
    )
    assert response.status_code == 200

    # Second contact with same email should fail
    response = client.post(
        "api/v1/contacts/",
        headers=normal_user_token_headers,
        json=contact_in.model_dump(),
    )
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


def test_read_contact(client: TestClient, normal_user_token_headers: dict[str, str]) -> None:
    """
    Test reading a contact.
    """
    email = random_email()
    name = random_lower_string()
    contact_in = ContactCreate(
        name=name,
        email=email,
        category="professional",
        tags=["colleague"],
        relationship_strength=500,
    )

    response = client.post(
        "api/v1/contacts/",
        headers=normal_user_token_headers,
        json=contact_in.model_dump(),
    )
    assert response.status_code == 200
    contact_data = response.json()
    contact_id = contact_data["id"]

    # Read the contact by id
    response = client.get(
        f"api/v1/contacts/{contact_id}",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == name
    assert data["email"] == email


def test_read_contacts(client: TestClient, normal_user_token_headers: dict[str, str]) -> None:
    """
    Test reading multiple contacts.
    """
    name1 = random_lower_string()
    email1 = random_email()
    contact1 = ContactCreate(
        name=name1,
        email=email1,
        category="professional",
        tags=["colleague"],
        relationship_strength=600,
    )

    name2 = random_lower_string()
    email2 = random_email()
    contact2 = ContactCreate(
        name=name2,
        email=email2,
        category="personal",
        tags=["friend"],
        relationship_strength=400,
    )

    response = client.post(
        "api/v1/contacts/",
        headers=normal_user_token_headers,
        json=contact1.model_dump(),
    )
    assert response.status_code == 200

    response = client.post(
        "api/v1/contacts/",
        headers=normal_user_token_headers,
        json=contact2.model_dump(),
    )
    assert response.status_code == 200

    response = client.get(
        "api/v1/contacts/",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["count"] >= 2
    names = {c["name"] for c in data["data"]}
    assert name1 in names
    assert name2 in names


def test_update_contact(client: TestClient, normal_user_token_headers: dict[str, str]) -> None:
    """
    Test updating a contact.
    """
    email = random_email()
    name = random_lower_string()
    contact_in = ContactCreate(
        name=name,
        email=email,
        category="professional",
        tags=["colleague"],
        relationship_strength=500,
    )

    response = client.post(
        "api/v1/contacts/",
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
        f"api/v1/contacts/{contact_id}",
        headers=normal_user_token_headers,
        json=update_data,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Name"
    assert data["phone"] == "123-456-7890"
    assert data["relationship_strength"] == 750


def test_delete_contact(client: TestClient, normal_user_token_headers: dict[str, str]) -> None:
    """
    Test deleting a contact.
    """
    email = random_email()
    name = random_lower_string()
    contact_in = ContactCreate(
        name=name,
        email=email,
        category="professional",
        tags=["colleague"],
        relationship_strength=500,
    )

    response = client.post(
        "api/v1/contacts/",
        headers=normal_user_token_headers,
        json=contact_in.model_dump(),
    )
    assert response.status_code == 200
    contact_id = response.json()["id"]

    # Delete the contact
    response = client.delete(
        f"api/v1/contacts/{contact_id}",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Contact deleted successfully"


def test_access_contact_owned_by_another_user(client: TestClient) -> None:
    """
    Test that users cannot access contacts owned by other users.
    """
    user1_email = random_email()
    user1_response = client.post(
        "api/v1/users/signup",
        json={
            "email": user1_email,
            "password": "password",
            "full_name": "User 1",
        },
    )
    assert user1_response.status_code == 200
    user1_token_response = client.post(
        "api/v1/login/access-token",
        data={"username": user1_email, "password": "password"},
    )
    assert user1_token_response.status_code == 200

    user2_email = random_email()
    user2_response = client.post(
        "api/v1/users/signup",
        json={
            "email": user2_email,
            "password": "password",
            "full_name": "User 2",
        },
    )
    assert user2_response.status_code == 200
    user2_token_response = client.post(
        "api/v1/login/access-token",
        data={"username": user2_email, "password": "password"},
    )
    assert user2_token_response.status_code == 200

    contact_in = ContactCreate(
        name="Contact 1",
        email=random_email(),
        category="professional",
        tags=["colleague"],
        relationship_strength=500,
    )
    response1 = client.post(
        "api/v1/contacts/",
        headers={"Authorization": f"Bearer {user1_token_response.json()['access_token']}"},
        json=contact_in.model_dump(),
    )
    assert response1.status_code == 200
    contact1_id = response1.json()["id"]

    response2 = client.get(
        f"api/v1/contacts/{contact1_id}",
        headers={"Authorization": f"Bearer {user2_token_response.json()['access_token']}"},
    )
    assert response2.status_code == 403

