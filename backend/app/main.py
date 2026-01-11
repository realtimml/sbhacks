from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.routers import auth, chat, proposals, webhooks, triggers
from app.services import redis_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize connections (Redis, etc.)
    print("Starting up...")
    await redis_service.init_redis()
    yield
    # Shutdown: Clean up connections
    print("Shutting down...")
    await redis_service.close_redis()


app = FastAPI(lifespan=lifespan)

# CORS configuration
origins = [
    "http://localhost:5173",  # Vite dev server
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(proposals.router)
app.include_router(webhooks.router)
app.include_router(triggers.router)


@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
