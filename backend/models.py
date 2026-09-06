from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Boolean,
    DateTime,
    ForeignKey,
    UniqueConstraint,
)

from sqlalchemy.orm import relationship

from backend.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String(100), nullable=False)

    email = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )

    password_hash = Column(
        String(255),
        nullable=False,
    )

    role = Column(
        String(20),
        nullable=False,
        default="user",
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    novels = relationship(
        "Novel",
        back_populates="owner",
        cascade="all, delete-orphan",
    )


class Novel(Base):
    __tablename__ = "novels"

    id = Column(Integer, primary_key=True, index=True)

    filename = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )

    title = Column(
        String(500),
        nullable=False,
    )

    author = Column(
        String(255),
        nullable=True,
    )

    genre = Column(
        String(255),
        nullable=True,
    )

    status = Column(
        String(100),
        nullable=True,
    )

    synopsis = Column(
        Text,
        nullable=True,
    )

    cover_image = Column(
        String(1000),
        nullable=True,
    )

    source_website = Column(
        String(500),
        nullable=True,
    )

    source_url = Column(
        String(1000),
        nullable=True,
    )

    total_chapters = Column(
        Integer,
        default=0,
        nullable=False,
    )

    last_updated = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    owner_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
    )

    owner = relationship(
        "User",
        back_populates="novels",
    )

    chapters = relationship(
        "Chapter",
        back_populates="novel",
        cascade="all, delete-orphan",
        order_by="Chapter.chapter_number",
    )


class Chapter(Base):
    __tablename__ = "chapters"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    novel_id = Column(
        Integer,
        ForeignKey("novels.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    chapter_number = Column(
        Integer,
        nullable=False,
    )

    title = Column(
        String(500),
        nullable=True,
    )

    date = Column(
        String(100),
        nullable=True,
    )

    views = Column(
        Integer,
        default=0,
        nullable=False,
    )

    is_locked = Column(
        Boolean,
        default=False,
        nullable=False,
    )

    url = Column(
        String(1000),
        nullable=True,
    )

    content = Column(
        Text,
        nullable=True,
    )

    scrape_status = Column(
        String(50),
        nullable=True,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    novel = relationship(
        "Novel",
        back_populates="chapters",
    )

    __table_args__ = (
        UniqueConstraint(
            "novel_id",
            "chapter_number",
            name="uq_novel_chapter_number",
        ),
    )