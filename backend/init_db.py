from backend.database import Base, engine
from backend.models import User, Novel, Chapter


Base.metadata.create_all(bind=engine)

print("Database tables created successfully.")