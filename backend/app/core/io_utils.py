import csv
import io
import json

from fastapi.responses import StreamingResponse

from app.models import Contact, ContactCreate, ContactPublic


CSV_FIELDS = [
    "name", "email", "phone", "category", "tags",
    "linkedin_url", "facebook_url", "photo_url",
    "relationship_strength", "first_met", "notes",
]


def serialize_contacts(contacts: list[Contact]) -> list[dict]:
    return [
        ContactPublic.model_validate(c).model_dump(exclude={"id", "user_id", "created_at"})
        for c in contacts
    ]


def export_json(contacts: list[Contact]):
    return serialize_contacts(contacts)


def export_csv(contacts: list[Contact]):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(CSV_FIELDS)

    for contact in contacts:
        tags = ",".join(contact.tags) if contact.tags else ""
        writer.writerow([
            contact.name,
            contact.email or "",
            contact.phone or "",
            contact.category,
            tags,
            contact.linkedin_url or "",
            contact.facebook_url or "",
            contact.photo_url or "",
            contact.relationship_strength,
            contact.first_met.isoformat() if contact.first_met else "",
            contact.notes or "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=contacts.csv"},
    )


def parse_import_data(data: str, format: str) -> list[dict]:
    if format == "json":
        parsed = json.loads(data)
        if isinstance(parsed, dict):
            parsed = [parsed]
        return parsed

    elif format == "csv":
        reader = csv.DictReader(io.StringIO(data))
        rows = []
        for row in reader:
            row = {k.strip(): v for k, v in row.items()}
            if row.get("tags"):
                row["tags"] = [t.strip() for t in row["tags"].split(",") if t.strip()]
            else:
                row["tags"] = []
            for field in ["relationship_strength"]:
                if field in row and row[field]:
                    try:
                        row[field] = int(row[field])
                    except (ValueError, TypeError):
                        pass
            rows.append(row)
        return rows

    raise ValueError(f"Unsupported format: {format}")
