import uuid

import boto3
from botocore.config import Config

from app.core.config import settings


def get_minio_client():
    return boto3.client(
        "s3",
        endpoint_url=f"http://{settings.MINIO_ENDPOINT}",
        aws_access_key_id=settings.MINIO_ACCESS_KEY,
        aws_secret_access_key=settings.MINIO_SECRET_KEY,
        config=Config(signature_version="s3v4"),
    )


def upload_photo(file_data: bytes, filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "jpg"
    key = f"photos/{uuid.uuid4()}.{ext}"

    content_map = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "gif": "image/gif", "webp": "image/webp"}
    content_type = content_map.get(ext, "application/octet-stream")

    client = get_minio_client()
    client.put_object(
        Bucket=settings.MINIO_BUCKET,
        Key=key,
        Body=file_data,
        ContentType=content_type,
    )

    return f"{settings.MINIO_PUBLIC_URL}/{settings.MINIO_BUCKET}/{key}"


def delete_photo(photo_url: str):
    if not photo_url:
        return
    key = photo_url.split(f"{settings.MINIO_BUCKET}/")[-1]
    if not key or "/" not in key:
        return
    client = get_minio_client()
    client.delete_object(Bucket=settings.MINIO_BUCKET, Key=key)
