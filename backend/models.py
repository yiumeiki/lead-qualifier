from sqlalchemy import Column, Integer, String, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Lead(Base):
    __tablename__ = 'leads'
    id = Column(Integer, primary_key=True)
    name = Column(String)
    company = Column(String)
    industry = Column(String)
    size = Column(Integer)
    source = Column(String)
    created_at = Column(DateTime)

class Event(Base):
    __tablename__ = 'events'
    id = Column(Integer, primary_key=True)
    user_id = Column(String)
    action = Column(String)
    event_metadata = Column(JSON)
    occurred_at = Column(DateTime) 