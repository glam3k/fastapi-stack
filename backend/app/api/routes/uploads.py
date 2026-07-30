from fastapi import APIRouter, UploadFile

from app.api.deps import CurrentUser
from app.core.storage import upload_photo

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("/photo")
def upload_photo_endpoint(
    file: UploadFile, current_user: CurrentUser
) -> dict:
    """
    Upload a photo and get the URL.
    """
    data = file.file.read()
    url = upload_photo(data, file.filename or "photo.jpg")
    return {"url": url}
