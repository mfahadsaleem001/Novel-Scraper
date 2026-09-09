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


# ============================================================
# USER MODEL
# ============================================================

class User(Base):

    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    name = Column(
        String(100),
        nullable=False,
    )

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

    reading_history = relationship(
        "ReadingHistory",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    saved_novels = relationship(
        "SavedNovel",
        back_populates="user",
        cascade="all, delete-orphan",
    )


# ============================================================
# NOVEL MODEL
# ============================================================

class Novel(Base):

    __tablename__ = "novels"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

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

    # ========================================================
    # AUTO SYNC
    # ========================================================

    last_synced_at = Column(
        DateTime,
        nullable=True,
    )

    sync_status = Column(
        String(30),
        nullable=False,
        default="pending",
    )

    last_sync_error = Column(
        Text,
        nullable=True,
    )

    # ========================================================
    # OWNER
    # ========================================================

    owner_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
    )

    owner = relationship(
        "User",
        back_populates="novels",
    )

    # ========================================================
    # CHAPTERS
    # ========================================================

    chapters = relationship(
        "Chapter",
        back_populates="novel",
        cascade="all, delete-orphan",
        order_by="Chapter.chapter_number",
    )

    # ========================================================
    # USER READING
    # ========================================================

    reading_history = relationship(
        "ReadingHistory",
        back_populates="novel",
        cascade="all, delete-orphan",
    )

    saved_by_users = relationship(
        "SavedNovel",
        back_populates="novel",
        cascade="all, delete-orphan",
    )


# ============================================================
# CHAPTER MODEL
# ============================================================

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

    # ========================================================
    # MANUAL / SOURCE CHAPTER
    # ========================================================

    is_manual = Column(
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


# ============================================================
# READING HISTORY MODEL
# ============================================================

class ReadingHistory(Base):

    __tablename__ = "reading_history"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    novel_id = Column(
        Integer,
        ForeignKey("novels.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    last_chapter_id = Column(
        Integer,
        ForeignKey("chapters.id", ondelete="SET NULL"),
        nullable=True,
    )

    last_chapter_number = Column(
        Integer,
        nullable=True,
    )

    last_read_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    user = relationship(
        "User",
        back_populates="reading_history",
    )

    novel = relationship(
        "Novel",
        back_populates="reading_history",
    )

    last_chapter = relationship(
        "Chapter",
        foreign_keys=[last_chapter_id],
    )

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "novel_id",
            name="uq_user_reading_history",
        ),
    )


# ============================================================
# SAVED NOVEL MODEL
# ============================================================

class SavedNovel(Base):

    __tablename__ = "saved_novels"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    novel_id = Column(
        Integer,
        ForeignKey("novels.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    saved_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    user = relationship(
        "User",
        back_populates="saved_novels",
    )

    novel = relationship(
        "Novel",
        back_populates="saved_by_users",
    )

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "novel_id",
            name="uq_user_saved_novel",
        ),
    )


# ============================================================
# SETTING MODEL
# ============================================================

class Setting(Base):

    __tablename__ = "settings"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    site_name = Column(
        String(100),
        nullable=False,
        default="Novel Archive",
    )

    site_description = Column(
        String(500),
        nullable=False,
        default="A modern novel archive.",
    )

    auto_sync_enabled = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    sync_interval = Column(
        Integer,
        nullable=False,
        default=30,
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )