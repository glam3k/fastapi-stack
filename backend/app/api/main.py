from importlib.metadata import version as pkg_version

from fastapi import APIRouter

from app.api.routes import items, login, private, uploads, users, utils
from app.core.config import settings

api_router = APIRouter()

@api_router.get("/version/", tags=["utils"])
def app_version():
    return {"name": settings.PROJECT_NAME, "version": pkg_version("app")}

api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(utils.router)
api_router.include_router(items.router)
api_router.include_router(uploads.router)

if settings.ENVIRONMENT == "local":
    api_router.include_router(private.router)
