from fastapi import FastAPI, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, select, and_
from sqlalchemy.orm import sessionmaker
from models import Base, Lead, Event
from datetime import datetime
import csv, os, json
import re
import openai
from dotenv import load_dotenv

DATABASE_URL = f"sqlite:///{os.path.abspath(os.path.join(os.path.dirname(__file__), '../data/leads.db'))}"
print("Using database at:", os.path.abspath("../data/leads.db"))
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables
Base.metadata.create_all(bind=engine)

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

def load_leads_from_csv():
    session = SessionLocal()
    if session.query(Lead).count() == 0:
        with open('../data/leads.csv') as f:
            reader = csv.DictReader(f)
            for row in reader:
                lead = Lead(
                    id=int(row['id']),
                    name=row['name'],
                    company=row['company'],
                    industry=row['industry'],
                    size=int(row['size']),
                    source=row['source'],
                    created_at=datetime.fromisoformat(row['created_at'].replace('Z',''))
                )
                session.add(lead)
            session.commit()
    session.close()

load_leads_from_csv()

def enrich_lead(lead):
    prompt = (
        f"Given a lead with the following fields:\n"
        f"- industry: {lead.industry}\n"
        f"- size: {lead.size}\n"
        f"Classify the lead quality as High, Medium, or Low:\n"
        f"- High: size > 100\n"
        f"- Medium: size 30-100\n"
        f"- Low: size < 30\n"
        f"Also, generate a short intro for the company (within 30 words) based on its name and industry.\n"
        f"Return JSON with fields: quality, summary."
    )
    try:
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}]
        )
        content = response.choices[0].message.content
        match = re.search(r'\{.*\}', content, re.DOTALL)
        if match:
            enrichment = json.loads(match.group(0))
            return enrichment
    except Exception as e:
        print("LLM enrichment error:", e)
    return {}

@app.get('/api/leads')
async def get_leads(industry: str = Query(None), size: int = Query(None)):
    session = SessionLocal()
    query = session.query(Lead)
    if industry:
        query = query.filter(Lead.industry == industry)
    if size:
        query = query.filter(Lead.size >= size)
    leads = query.all()
    session.close()
    enriched = []
    for lead in leads:
        lead_dict = lead.__dict__.copy()
        lead_dict.pop('_sa_instance_state', None)
        enrichment = enrich_lead(lead)
        lead_dict.update(enrichment)
        enriched.append(lead_dict)
    return enriched

@app.post('/api/events')
async def post_event(request: Request):
    session = SessionLocal()
    data = await request.json()
    event = Event(
        user_id=data.get('userId'),
        action=data.get('action'),
        event_metadata=data.get('metadata'),
        occurred_at=datetime.fromisoformat(data.get('timestamp').replace('Z','')) if data.get('timestamp') else datetime.utcnow()
    )
    session.add(event)
    session.commit()
    session.close()
    return {"status": "ok"}

@app.get('/api/events')
def get_events():
    session = SessionLocal()
    events = session.query(Event).all()
    session.close()
    return [{k: v for k, v in e.__dict__.items() if k != '_sa_instance_state'} for e in events] 