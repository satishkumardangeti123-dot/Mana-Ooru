from fastapi import FastAPI, APIRouter, HTTPException, Query, Header, UploadFile, File
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
import uuid
import re
import tempfile
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timedelta, timezone

import httpx
import hashlib
import requests
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
EMERGENT_PUSH_KEY = os.environ.get("EMERGENT_PUSH_KEY", "placeholder")
ADMIN_EMAILS = {e.strip().lower() for e in (os.environ.get("ADMIN_EMAILS", "") or "").split(",") if e.strip()}

client = AsyncIOMotorClient(mongo_url)
db = client[DB_NAME]

app = FastAPI(title="Mana Ooru API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("mana_ooru")

PROJECTION = {"_id": 0}


# ---------------- Models ----------------
class Location(BaseModel):
    id: str
    name_en: str
    name_te: str
    district_en: str
    district_te: str
    state_en: str
    state_te: str
    lat: float
    lng: float


class Business(BaseModel):
    id: str
    location_id: str
    category: str
    section: str
    name_en: str
    name_te: str
    subtitle_en: Optional[str] = None
    subtitle_te: Optional[str] = None
    phone: Optional[str] = None
    address_en: Optional[str] = None
    address_te: Optional[str] = None
    distance_km: Optional[float] = None
    open_now: bool = True
    hours_en: Optional[str] = None
    hours_te: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    verified: bool = False


class EmergencyContact(BaseModel):
    id: str
    slug: str
    label_en: str
    label_te: str
    number: str
    official: bool = True


class Update(BaseModel):
    id: str
    location_id: str
    title_en: str
    title_te: str
    body_en: str
    body_te: str
    posted_at: str
    tag_en: Optional[str] = None
    tag_te: Optional[str] = None


class SearchQuery(BaseModel):
    query: str
    location_id: str
    lang: str = "en"


class SearchResult(BaseModel):
    intent: dict
    businesses: List[Business]


class SessionRequest(BaseModel):
    session_id: str


class RegisterPushBody(BaseModel):
    user_id: str
    platform: str
    device_token: str


class BroadcastBody(BaseModel):
    location_id: str
    title: str
    message: str
    tag_en: Optional[str] = None
    tag_te: Optional[str] = None


class FavouriteBody(BaseModel):
    business_id: str


class VoiceResult(BaseModel):
    text: str
    language: str


class PostCreate(BaseModel):
    title: str
    body: str
    image_path: Optional[str] = None
    location_id: str


class Post(BaseModel):
    id: str
    location_id: str
    user_id: str
    author_name: Optional[str] = None
    author_picture: Optional[str] = None
    title: str
    body: str
    image_path: Optional[str] = None
    posted_at: str
    reports: int = 0
    hidden: bool = False


class BusinessEditLogin(BaseModel):
    code: str


class BusinessUpdate(BaseModel):
    name_en: Optional[str] = None
    name_te: Optional[str] = None
    subtitle_en: Optional[str] = None
    subtitle_te: Optional[str] = None
    phone: Optional[str] = None
    address_en: Optional[str] = None
    address_te: Optional[str] = None
    open_now: Optional[bool] = None
    hours_en: Optional[str] = None
    hours_te: Optional[str] = None


# ---------------- Seed data ----------------
def _uid() -> str:
    return str(uuid.uuid4())


LOCATIONS_SEED = [
    {"id": "patavala", "name_en": "Patavala", "name_te": "పటవల", "district_en": "Kakinada", "district_te": "కాకినాడ", "state_en": "Andhra Pradesh", "state_te": "ఆంధ్రప్రదేశ్", "lat": 16.9891, "lng": 82.2475},
    {"id": "kakinada", "name_en": "Kakinada", "name_te": "కాకినాడ", "district_en": "Kakinada", "district_te": "కాకినాడ", "state_en": "Andhra Pradesh", "state_te": "ఆంధ్రప్రదేశ్", "lat": 16.9891, "lng": 82.2475},
    {"id": "samalkota", "name_en": "Samalkota", "name_te": "సామర్లకోట", "district_en": "Kakinada", "district_te": "కాకినాడ", "state_en": "Andhra Pradesh", "state_te": "ఆంధ్రప్రదేశ్", "lat": 17.0530, "lng": 82.1710},
]

EMERGENCY_SEED = [
    {"id": _uid(), "slug": "ambulance", "label_en": "Ambulance", "label_te": "అంబులెన్స్", "number": "108", "official": True},
    {"id": _uid(), "slug": "police", "label_en": "Police", "label_te": "పోలీసు", "number": "100", "official": True},
    {"id": _uid(), "slug": "fire", "label_en": "Fire", "label_te": "అగ్నిమాపక", "number": "101", "official": True},
    {"id": _uid(), "slug": "women", "label_en": "Women Helpline", "label_te": "మహిళా హెల్ప్‌లైన్", "number": "1091", "official": True},
    {"id": _uid(), "slug": "child", "label_en": "Child Helpline", "label_te": "బాలల హెల్ప్‌లైన్", "number": "1098", "official": True},
    {"id": _uid(), "slug": "disaster", "label_en": "Disaster Management", "label_te": "విపత్తు నిర్వహణ", "number": "112", "official": True},
]

BUSINESSES_SEED = [
    {"id": _uid(), "location_id": "patavala", "section": "health", "category": "pharmacy", "name_en": "Sri Sai Medicals", "name_te": "శ్రీ సాయి మెడికల్స్", "subtitle_en": "Pharmacy", "subtitle_te": "ఔషధశాల", "phone": "+919000000001", "address_en": "Main Road, Patavala", "address_te": "మెయిన్ రోడ్, పటవల", "distance_km": 0.4, "open_now": True, "hours_en": "8:00 AM – 10:00 PM", "hours_te": "ఉ 8:00 – రా 10:00"},
    {"id": _uid(), "location_id": "patavala", "section": "health", "category": "pharmacy", "name_en": "Apollo Pharmacy", "name_te": "అపోలో ఫార్మసీ", "subtitle_en": "24x7 Pharmacy", "subtitle_te": "24x7 ఔషధశాల", "phone": "+919000000002", "address_en": "Bus Stand Road", "address_te": "బస్‌స్టాండ్ రోడ్", "distance_km": 1.2, "open_now": True, "hours_en": "24 hours", "hours_te": "24 గంటలు"},
    {"id": _uid(), "location_id": "patavala", "section": "health", "category": "pharmacy", "name_en": "MedPlus", "name_te": "మెడ్ ప్లస్", "subtitle_en": "Pharmacy", "subtitle_te": "ఔషధశాల", "phone": "+919000000003", "address_en": "Near Panchayat Office", "address_te": "పంచాయతీ కార్యాలయం దగ్గర", "distance_km": 0.9, "open_now": False, "hours_en": "9:00 AM – 9:00 PM", "hours_te": "ఉ 9:00 – రా 9:00"},
    {"id": _uid(), "location_id": "patavala", "section": "health", "category": "hospital", "name_en": "Government Community Health Centre", "name_te": "ప్రభుత్వ కమ్యూనిటీ హెల్త్ సెంటర్", "subtitle_en": "Public Hospital", "subtitle_te": "ప్రభుత్వ ఆసుపత్రి", "phone": "+919000000010", "address_en": "Health Centre Road", "address_te": "ఆరోగ్య కేంద్రం రోడ్", "distance_km": 1.8, "open_now": True, "hours_en": "24 hours", "hours_te": "24 గంటలు"},
    {"id": _uid(), "location_id": "patavala", "section": "health", "category": "hospital", "name_en": "GEMS Hospital", "name_te": "GEMS ఆసుపత్రి", "subtitle_en": "Multi-speciality", "subtitle_te": "బహుళ ప్రత్యేకత", "phone": "+918842242222", "address_en": "Ragampet, Kakinada", "address_te": "రాగంపేట, కాకినాడ", "distance_km": 7.2, "open_now": True, "hours_en": "24 hours", "hours_te": "24 గంటలు"},
    {"id": _uid(), "location_id": "patavala", "section": "health", "category": "doctor", "name_en": "Dr. Ramesh Clinic", "name_te": "డా. రమేష్ క్లినిక్", "subtitle_en": "General Physician", "subtitle_te": "సాధారణ వైద్యుడు", "phone": "+919000000020", "address_en": "Temple Street", "address_te": "టెంపుల్ స్ట్రీట్", "distance_km": 0.6, "open_now": True, "hours_en": "9:00 AM – 1:00 PM, 5:00 PM – 8:00 PM", "hours_te": "ఉ 9-1, సా 5-8"},
    {"id": _uid(), "location_id": "patavala", "section": "health", "category": "doctor", "name_en": "Dr. Lakshmi (Paediatrics)", "name_te": "డా. లక్ష్మి (శిశు వైద్యం)", "subtitle_en": "Paediatrician", "subtitle_te": "శిశు వైద్యురాలు", "phone": "+919000000021", "address_en": "Market Road", "address_te": "మార్కెట్ రోడ్", "distance_km": 1.1, "open_now": False, "hours_en": "10:00 AM – 6:00 PM", "hours_te": "ఉ 10 – సా 6"},
    {"id": _uid(), "location_id": "patavala", "section": "health", "category": "ambulance", "name_en": "108 Ambulance Service", "name_te": "108 అంబులెన్స్ సర్వీస్", "subtitle_en": "Free Emergency Ambulance", "subtitle_te": "ఉచిత అత్యవసర అంబులెన్స్", "phone": "108", "address_en": "Andhra Pradesh", "address_te": "ఆంధ్రప్రదేశ్", "distance_km": None, "open_now": True, "hours_en": "24 hours", "hours_te": "24 గంటలు"},
    {"id": _uid(), "location_id": "patavala", "section": "health", "category": "lab", "name_en": "Vijaya Diagnostics", "name_te": "విజయ డయాగ్నస్టిక్స్", "subtitle_en": "Diagnostic Lab", "subtitle_te": "డయాగ్నస్టిక్ ల్యాబ్", "phone": "+919000000030", "address_en": "Kakinada Road", "address_te": "కాకినాడ రోడ్", "distance_km": 2.4, "open_now": True, "hours_en": "7:00 AM – 8:00 PM", "hours_te": "ఉ 7 – రా 8"},
    {"id": _uid(), "location_id": "patavala", "section": "health", "category": "dental", "name_en": "Smile Dental Care", "name_te": "స్మైల్ డెంటల్ కేర్", "subtitle_en": "Dental Clinic", "subtitle_te": "దంత చికిత్సాలయం", "phone": "+919000000040", "address_en": "New Colony", "address_te": "న్యూ కాలనీ", "distance_km": 1.5, "open_now": True, "hours_en": "10:00 AM – 8:00 PM", "hours_te": "ఉ 10 – రా 8"},
    {"id": _uid(), "location_id": "patavala", "section": "health", "category": "eye", "name_en": "Sankar Eye Care", "name_te": "శంకర్ ఐ కేర్", "subtitle_en": "Eye Hospital", "subtitle_te": "కంటి ఆసుపత్రి", "phone": "+919000000041", "address_en": "Kakinada Bypass", "address_te": "కాకినాడ బైపాస్", "distance_km": 6.0, "open_now": True, "hours_en": "9:00 AM – 6:00 PM", "hours_te": "ఉ 9 – సా 6"},
    {"id": _uid(), "location_id": "patavala", "section": "transport", "category": "bus", "name_en": "APSRTC Bus Stand", "name_te": "APSRTC బస్ స్టాండ్", "subtitle_en": "Buses to Kakinada, Rajahmundry", "subtitle_te": "కాకినాడ, రాజమండ్రి బస్సులు", "phone": "+918842369966", "address_en": "Bus Stand Road", "address_te": "బస్‌స్టాండ్ రోడ్", "distance_km": 1.0, "open_now": True, "hours_en": "5:00 AM – 11:00 PM", "hours_te": "ఉ 5 – రా 11"},
    {"id": _uid(), "location_id": "patavala", "section": "transport", "category": "auto", "name_en": "Auto Stand", "name_te": "ఆటో స్టాండ్", "subtitle_en": "Shared & private autos", "subtitle_te": "షేర్డ్ & ప్రైవేట్ ఆటోలు", "phone": "+919000000050", "address_en": "Main Junction", "address_te": "మెయిన్ జంక్షన్", "distance_km": 0.3, "open_now": True, "hours_en": "6:00 AM – 10:00 PM", "hours_te": "ఉ 6 – రా 10"},
    {"id": _uid(), "location_id": "patavala", "section": "transport", "category": "train", "name_en": "Samalkot Junction", "name_te": "సామర్లకోట జంక్షన్", "subtitle_en": "Nearest railway station", "subtitle_te": "సమీప రైల్వే స్టేషన్", "phone": "139", "address_en": "Samalkota", "address_te": "సామర్లకోట", "distance_km": 8.5, "open_now": True, "hours_en": "24 hours", "hours_te": "24 గంటలు"},
    {"id": _uid(), "location_id": "patavala", "section": "shops", "category": "grocery", "name_en": "Ramanaiah Kirana Store", "name_te": "రామనయ్య కిరాణా స్టోర్", "subtitle_en": "Grocery Store", "subtitle_te": "కిరాణా దుకాణం", "phone": "+919000000060", "address_en": "Main Bazaar", "address_te": "మెయిన్ బజార్", "distance_km": 0.2, "open_now": True, "hours_en": "7:00 AM – 10:00 PM", "hours_te": "ఉ 7 – రా 10"},
    {"id": _uid(), "location_id": "patavala", "section": "shops", "category": "vegetables", "name_en": "Daily Vegetable Market", "name_te": "రోజువారీ కూరగాయల మార్కెట్", "subtitle_en": "Fresh vegetables", "subtitle_te": "తాజా కూరగాయలు", "phone": None, "address_en": "Market Yard", "address_te": "మార్కెట్ యార్డ్", "distance_km": 0.5, "open_now": True, "hours_en": "5:00 AM – 12:00 PM", "hours_te": "ఉ 5 – మ 12"},
    {"id": _uid(), "location_id": "patavala", "section": "shops", "category": "hardware", "name_en": "Balaji Hardware", "name_te": "బాలాజీ హార్డ్‌వేర్", "subtitle_en": "Hardware & Paints", "subtitle_te": "హార్డ్‌వేర్ & పెయింట్స్", "phone": "+919000000061", "address_en": "Bus Stand Road", "address_te": "బస్‌స్టాండ్ రోడ్", "distance_km": 0.8, "open_now": True, "hours_en": "9:00 AM – 8:00 PM", "hours_te": "ఉ 9 – రా 8"},
    {"id": _uid(), "location_id": "patavala", "section": "services", "category": "electrician", "name_en": "Suresh Electrical Works", "name_te": "సురేష్ ఎలక్ట్రికల్ వర్క్స్", "subtitle_en": "Electrician", "subtitle_te": "ఎలక్ట్రీషియన్", "phone": "+919000000070", "address_en": "Main Road", "address_te": "మెయిన్ రోడ్", "distance_km": 0.4, "open_now": True, "hours_en": "8:00 AM – 8:00 PM", "hours_te": "ఉ 8 – రా 8"},
    {"id": _uid(), "location_id": "patavala", "section": "services", "category": "plumber", "name_en": "Ravi Plumbing", "name_te": "రవి ప్లంబింగ్", "subtitle_en": "Plumber", "subtitle_te": "ప్లంబర్", "phone": "+919000000071", "address_en": "Colony Road", "address_te": "కాలనీ రోడ్", "distance_km": 0.7, "open_now": True, "hours_en": "8:00 AM – 8:00 PM", "hours_te": "ఉ 8 – రా 8"},
    {"id": _uid(), "location_id": "patavala", "section": "services", "category": "carpenter", "name_en": "Krishna Carpentry", "name_te": "కృష్ణ కార్పెంట్రీ", "subtitle_en": "Carpenter", "subtitle_te": "కార్పెంటర్", "phone": "+919000000072", "address_en": "New Colony", "address_te": "న్యూ కాలనీ", "distance_km": 1.0, "open_now": False, "hours_en": "9:00 AM – 6:00 PM", "hours_te": "ఉ 9 – సా 6"},
    {"id": _uid(), "location_id": "patavala", "section": "government", "category": "panchayat", "name_en": "Gram Panchayat Office", "name_te": "గ్రామ పంచాయతీ కార్యాలయం", "subtitle_en": "Panchayat Office", "subtitle_te": "పంచాయతీ కార్యాలయం", "phone": "+919000000080", "address_en": "Panchayat Bhavan", "address_te": "పంచాయతీ భవన్", "distance_km": 0.6, "open_now": True, "hours_en": "10:00 AM – 5:00 PM (Mon-Sat)", "hours_te": "సో-శ ఉ 10 – సా 5"},
    {"id": _uid(), "location_id": "patavala", "section": "government", "category": "meeseva", "name_en": "MeeSeva Centre", "name_te": "మీసేవ కేంద్రం", "subtitle_en": "Certificates & Aadhaar", "subtitle_te": "సర్టిఫికెట్లు & ఆధార్", "phone": "+919000000081", "address_en": "Main Road", "address_te": "మెయిన్ రోడ్", "distance_km": 0.5, "open_now": True, "hours_en": "9:30 AM – 5:30 PM", "hours_te": "ఉ 9:30 – సా 5:30"},
    {"id": _uid(), "location_id": "patavala", "section": "government", "category": "post", "name_en": "Post Office", "name_te": "పోస్ట్ ఆఫీస్", "subtitle_en": "India Post branch", "subtitle_te": "ఇండియా పోస్ట్ శాఖ", "phone": "+919000000082", "address_en": "Post Office Street", "address_te": "పోస్ట్ ఆఫీస్ వీధి", "distance_km": 0.7, "open_now": True, "hours_en": "10:00 AM – 4:00 PM", "hours_te": "ఉ 10 – సా 4"},
    {"id": _uid(), "location_id": "patavala", "section": "government", "category": "bank", "name_en": "State Bank of India", "name_te": "స్టేట్ బ్యాంక్ ఆఫ్ ఇండియా", "subtitle_en": "SBI Branch & ATM", "subtitle_te": "SBI శాఖ & ATM", "phone": "+919000000083", "address_en": "Bank Road", "address_te": "బ్యాంక్ రోడ్", "distance_km": 0.9, "open_now": True, "hours_en": "10:00 AM – 4:00 PM", "hours_te": "ఉ 10 – సా 4"},
    {"id": _uid(), "location_id": "patavala", "section": "agriculture", "category": "rythu-bharosa", "name_en": "Rythu Bharosa Kendra", "name_te": "రైతు భరోసా కేంద్రం", "subtitle_en": "Seeds & advisory", "subtitle_te": "విత్తనాలు & సలహా", "phone": "+919000000090", "address_en": "Agri Complex", "address_te": "వ్యవసాయ కాంప్లెక్స్", "distance_km": 0.8, "open_now": True, "hours_en": "8:00 AM – 4:00 PM", "hours_te": "ఉ 8 – సా 4"},
    {"id": _uid(), "location_id": "patavala", "section": "agriculture", "category": "fertilizer", "name_en": "Ganesh Fertilizers", "name_te": "గణేష్ ఫర్టిలైజర్స్", "subtitle_en": "Fertilizers & pesticides", "subtitle_te": "ఎరువులు & పురుగుమందులు", "phone": "+919000000091", "address_en": "Market Road", "address_te": "మార్కెట్ రోడ్", "distance_km": 1.0, "open_now": True, "hours_en": "8:00 AM – 8:00 PM", "hours_te": "ఉ 8 – రా 8"},
    {"id": _uid(), "location_id": "patavala", "section": "agriculture", "category": "dairy", "name_en": "Milk Collection Centre", "name_te": "పాల సేకరణ కేంద్రం", "subtitle_en": "Dairy co-operative", "subtitle_te": "పాల సహకార సంఘం", "phone": "+919000000092", "address_en": "Village Centre", "address_te": "గ్రామ మధ్య", "distance_km": 0.3, "open_now": True, "hours_en": "5:00 AM – 8:00 AM, 5:00 PM – 8:00 PM", "hours_te": "ఉ 5-8, సా 5-8"},
]

UPDATES_SEED = [
    {"id": _uid(), "location_id": "patavala", "title_en": "Panchayat meeting on Saturday", "title_te": "శనివారం పంచాయతీ సమావేశం", "body_en": "The monthly gram sabha will be held on Saturday at 5 PM at the Panchayat office.", "body_te": "మాసిక గ్రామసభ శనివారం సాయంత్రం 5 గంటలకు పంచాయతీ కార్యాలయంలో జరుగుతుంది.", "posted_at": datetime.now(timezone.utc).isoformat(), "tag_en": "Announcement", "tag_te": "ప్రకటన"},
    {"id": _uid(), "location_id": "patavala", "title_en": "Free health camp on Sunday", "title_te": "ఆదివారం ఉచిత ఆరోగ్య శిబిరం", "body_en": "Free general health checkup camp at Community Health Centre from 9 AM to 1 PM.", "body_te": "కమ్యూనిటీ హెల్త్ సెంటర్‌లో ఉ 9 నుండి మ 1 వరకు ఉచిత సాధారణ ఆరోగ్య పరీక్ష శిబిరం.", "posted_at": datetime.now(timezone.utc).isoformat(), "tag_en": "Health", "tag_te": "ఆరోగ్యం"},
    {"id": _uid(), "location_id": "patavala", "title_en": "Water supply schedule update", "title_te": "నీటి సరఫరా షెడ్యూల్ నవీకరణ", "body_en": "From this week water supply will be from 6 AM to 9 AM and 5 PM to 7 PM.", "body_te": "ఈ వారం నుండి నీటి సరఫరా ఉ 6-9 & సా 5-7 గంటలకు ఉంటుంది.", "posted_at": datetime.now(timezone.utc).isoformat(), "tag_en": "Utility", "tag_te": "సేవలు"},
]


# APSRTC-style bus schedule for Patavala ↔ Kakinada (daily). Times in IST (UTC+5:30).
# Curated based on typical timings; each entry: (hour, minute, route_key)
BUS_SCHEDULE_PATAVALA = [
    {"minutes": h * 60 + m, "to_en": to_en, "to_te": to_te, "route": route}
    for (h, m, to_en, to_te, route) in [
        (5, 30, "Kakinada", "కాకినాడ", "Ordinary"),
        (6, 0, "Kakinada", "కాకినాడ", "Palle Velugu"),
        (6, 30, "Rajahmundry", "రాజమండ్రి", "Express"),
        (7, 0, "Kakinada", "కాకినాడ", "Ordinary"),
        (7, 30, "Kakinada", "కాకినాడ", "Palle Velugu"),
        (8, 0, "Samalkota", "సామర్లకోట", "Ordinary"),
        (8, 30, "Kakinada", "కాకినాడ", "Ordinary"),
        (9, 15, "Kakinada", "కాకినాడ", "Palle Velugu"),
        (10, 0, "Rajahmundry", "రాజమండ్రి", "Express"),
        (10, 45, "Kakinada", "కాకినాడ", "Ordinary"),
        (11, 30, "Kakinada", "కాకినాడ", "Palle Velugu"),
        (12, 15, "Samalkota", "సామర్లకోట", "Ordinary"),
        (13, 0, "Kakinada", "కాకినాడ", "Ordinary"),
        (13, 45, "Kakinada", "కాకినాడ", "Palle Velugu"),
        (14, 30, "Rajahmundry", "రాజమండ్రి", "Express"),
        (15, 15, "Kakinada", "కాకినాడ", "Ordinary"),
        (16, 0, "Kakinada", "కాకినాడ", "Palle Velugu"),
        (16, 45, "Kakinada", "కాకినాడ", "Ordinary"),
        (17, 30, "Kakinada", "కాకినాడ", "Palle Velugu"),
        (18, 15, "Samalkota", "సామర్లకోట", "Ordinary"),
        (19, 0, "Kakinada", "కాకినాడ", "Ordinary"),
        (19, 45, "Kakinada", "కాకినాడ", "Palle Velugu"),
        (20, 30, "Rajahmundry", "రాజమండ్రి", "Express"),
        (21, 15, "Kakinada", "కాకినాడ", "Ordinary"),
        (22, 0, "Kakinada", "కాకినాడ", "Ordinary"),
    ]
]


async def seed_if_empty():
    if await db.locations.count_documents({}) == 0:
        await db.locations.insert_many([dict(x) for x in LOCATIONS_SEED])
        logger.info("Seeded %d locations", len(LOCATIONS_SEED))
    if await db.emergency.count_documents({}) == 0:
        await db.emergency.insert_many([dict(x) for x in EMERGENCY_SEED])
        logger.info("Seeded %d emergency contacts", len(EMERGENCY_SEED))
    if await db.businesses.count_documents({}) == 0:
        await db.businesses.insert_many([dict(x) for x in BUSINESSES_SEED])
        logger.info("Seeded %d businesses", len(BUSINESSES_SEED))
    if await db.updates.count_documents({}) == 0:
        await db.updates.insert_many([dict(x) for x in UPDATES_SEED])
        logger.info("Seeded %d updates", len(UPDATES_SEED))
    # Backfill edit_code on any business missing it (6-digit derived from id hash)
    async for biz in db.businesses.find({"edit_code": {"$exists": False}}, PROJECTION):
        code = f"{int(hashlib.sha1(biz['id'].encode()).hexdigest(), 16) % 1000000:06d}"
        await db.businesses.update_one({"id": biz["id"]}, {"$set": {"edit_code": code}})
    # Indexes
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("user_id", unique=True)
        await db.user_sessions.create_index("session_token", unique=True)
        await db.user_sessions.create_index("user_id")
        await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
        await db.push_tokens.create_index("device_token", unique=True)
        await db.posts.create_index([("location_id", 1), ("posted_at", -1)])
        await db.biz_edit_tokens.create_index("expires_at", expireAfterSeconds=0)
    except Exception as e:
        logger.warning("index create: %s", e)


# ---------------- Object storage ----------------
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
APP_NAME = "mana-ooru"
_storage_key: Optional[str] = None


def _sync_init_storage() -> Optional[str]:
    global _storage_key
    if _storage_key:
        return _storage_key
    if not EMERGENT_LLM_KEY:
        return None
    try:
        r = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
        r.raise_for_status()
        _storage_key = r.json().get("storage_key")
        return _storage_key
    except Exception as e:
        logger.warning("storage init failed: %s", e)
        return None


def _sync_put(path: str, data: bytes, content_type: str) -> dict:
    global _storage_key
    key = _sync_init_storage()
    if not key:
        raise HTTPException(500, "object storage unavailable")
    r = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120,
    )
    if r.status_code == 503:
        _storage_key = None
        key = _sync_init_storage()
        if not key:
            raise HTTPException(503, "storage transient")
        r = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=120,
        )
    if r.status_code == 402:
        raise HTTPException(402, "storage credits exhausted")
    r.raise_for_status()
    return r.json()


def _sync_get(path: str):
    key = _sync_init_storage()
    if not key:
        raise HTTPException(500, "object storage unavailable")
    r = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if r.status_code == 500:
        raise HTTPException(404, "not found")
    r.raise_for_status()
    return r.content, r.headers.get("Content-Type", "application/octet-stream")


# ---------------- Auth helpers ----------------
async def current_user(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    session = await db.user_sessions.find_one({"session_token": token}, PROJECTION)
    if not session:
        return None
    exp = session.get("expires_at")
    if isinstance(exp, datetime):
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < datetime.now(timezone.utc):
            return None
    user = await db.users.find_one({"user_id": session["user_id"]}, PROJECTION)
    return user


async def require_user(authorization: Optional[str] = Header(None)) -> dict:
    u = await current_user(authorization)
    if not u:
        raise HTTPException(401, "unauthenticated")
    return u


# ---------------- Routes ----------------
@api_router.get("/")
async def root():
    return {"app": "Mana Ooru", "status": "ok"}


@api_router.get("/locations", response_model=List[Location])
async def list_locations():
    rows = await db.locations.find({}, PROJECTION).to_list(200)
    return [Location(**r) for r in rows]


@api_router.get("/locations/{location_id}", response_model=Location)
async def get_location(location_id: str):
    row = await db.locations.find_one({"id": location_id}, PROJECTION)
    if not row:
        raise HTTPException(404, "location not found")
    return Location(**row)


@api_router.get("/emergency", response_model=List[EmergencyContact])
async def list_emergency():
    rows = await db.emergency.find({}, PROJECTION).to_list(50)
    return [EmergencyContact(**r) for r in rows]


@api_router.get("/businesses", response_model=List[Business])
async def list_businesses(
    location_id: str = Query(...),
    section: Optional[str] = None,
    category: Optional[str] = None,
    q: Optional[str] = None,
):
    filt: dict = {"location_id": location_id}
    if section:
        filt["section"] = section
    if category and category != "all":
        filt["category"] = category
    if q:
        pattern = re.escape(q)
        filt["$or"] = [
            {"name_en": {"$regex": pattern, "$options": "i"}},
            {"name_te": {"$regex": pattern, "$options": "i"}},
            {"subtitle_en": {"$regex": pattern, "$options": "i"}},
            {"subtitle_te": {"$regex": pattern, "$options": "i"}},
            {"category": {"$regex": pattern, "$options": "i"}},
        ]
    rows = await db.businesses.find(filt, PROJECTION).to_list(500)
    rows.sort(key=lambda r: (r.get("distance_km") is None, r.get("distance_km") or 0))
    return [Business(**r) for r in rows]


@api_router.get("/businesses/{business_id}", response_model=Business)
async def get_business(business_id: str):
    row = await db.businesses.find_one({"id": business_id}, PROJECTION)
    if not row:
        raise HTTPException(404, "business not found")
    return Business(**row)


@api_router.get("/updates", response_model=List[Update])
async def list_updates(location_id: str = Query(...)):
    rows = await db.updates.find({"location_id": location_id}, PROJECTION).to_list(200)
    rows.sort(key=lambda r: r.get("posted_at", ""), reverse=True)
    return [Update(**r) for r in rows]


# ---------------- Bus timings ----------------
@api_router.get("/buses")
async def next_buses(location_id: str = Query(...), limit: int = 6):
    if location_id != "patavala":
        return {"location_id": location_id, "buses": []}
    now = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)  # IST
    now_min = now.hour * 60 + now.minute
    upcoming = [b for b in BUS_SCHEDULE_PATAVALA if b["minutes"] >= now_min]
    if len(upcoming) < limit:
        upcoming += BUS_SCHEDULE_PATAVALA[: limit - len(upcoming)]
    out = []
    for b in upcoming[:limit]:
        h, m = divmod(b["minutes"], 60)
        eta = b["minutes"] - now_min
        if eta < 0:
            eta += 24 * 60
        out.append({
            "time": f"{h:02d}:{m:02d}",
            "eta_min": eta,
            "to_en": b["to_en"],
            "to_te": b["to_te"],
            "route": b["route"],
        })
    return {"location_id": location_id, "buses": out, "now_ist": now.strftime("%H:%M")}


# ---------------- AI Search ----------------
CATEGORY_KEYWORDS = {
    "health": ["hospital", "clinic", "doctor", "pharmacy", "medicine", "medical", "medicals", "dental", "eye", "lab", "diagnostic", "ambulance", "ఆసుపత్రి", "డాక్టర్", "మందు", "ఔషధ", "అంబులెన్స్"],
    "transport": ["bus", "train", "auto", "rickshaw", "taxi", "travel", "railway", "బస్", "ఆటో", "రైలు"],
    "shops": ["shop", "store", "grocery", "kirana", "vegetables", "hardware", "మార్కెట్", "కిరాణా", "కూరగాయ"],
    "services": ["electrician", "plumber", "carpenter", "repair", "mechanic", "ఎలక్ట్రీషియన్", "ప్లంబర్"],
    "government": ["panchayat", "meeseva", "aadhaar", "post office", "bank", "government", "పంచాయతీ", "మీసేవ", "బ్యాంక్"],
    "agriculture": ["farm", "fertilizer", "seed", "rythu", "dairy", "milk", "వ్యవసాయ", "రైతు", "పాల"],
    "emergency": ["emergency", "police", "fire", "అత్యవసర", "పోలీసు", "అగ్ని"],
}


def rule_based_intent(query: str) -> dict:
    q = query.lower()
    best_section = None
    best_score = 0
    for section, kws in CATEGORY_KEYWORDS.items():
        score = sum(1 for kw in kws if kw.lower() in q)
        if score > best_score:
            best_score = score
            best_section = section
    return {"section": best_section, "keywords": query, "confidence": min(1.0, best_score / 2.0)}


async def llm_intent(query: str, lang: str) -> dict:
    if not EMERGENT_LLM_KEY:
        return rule_based_intent(query)
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        system = (
            "You classify a user's search query for a village directory app in India. "
            "Categories (sections): health, transport, shops, services, government, agriculture, emergency, updates. "
            "Reply ONLY as compact JSON like {\"section\":\"health\",\"keywords\":\"pharmacy\"} — no prose, no markdown."
        )
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"search-{uuid.uuid4()}",
            system_message=system,
        ).with_model("gemini", "gemini-3-flash-preview")
        resp = await chat.send_message(UserMessage(text=f"Query ({lang}): {query}"))
        text = resp if isinstance(resp, str) else str(resp)
        text = re.sub(r"```(?:json)?", "", text).strip("` \n")
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if not m:
            return rule_based_intent(query)
        data = json.loads(m.group(0))
        section = data.get("section")
        if section not in CATEGORY_KEYWORDS and section not in {"updates"}:
            section = None
        return {"section": section, "keywords": data.get("keywords", query), "confidence": 0.9}
    except Exception as e:
        logger.warning("llm intent failed: %s", e)
        return rule_based_intent(query)


@api_router.post("/search", response_model=SearchResult)
async def search(payload: SearchQuery):
    intent = await llm_intent(payload.query, payload.lang)
    filt: dict = {"location_id": payload.location_id}
    if intent.get("section") and intent["section"] in {"health", "transport", "shops", "services", "government", "agriculture"}:
        filt["section"] = intent["section"]
    kws = (intent.get("keywords") or payload.query).strip()
    if kws:
        pattern = re.escape(kws)
        filt["$or"] = [
            {"name_en": {"$regex": pattern, "$options": "i"}},
            {"name_te": {"$regex": pattern, "$options": "i"}},
            {"subtitle_en": {"$regex": pattern, "$options": "i"}},
            {"subtitle_te": {"$regex": pattern, "$options": "i"}},
            {"category": {"$regex": pattern, "$options": "i"}},
        ]
    rows = await db.businesses.find(filt, PROJECTION).to_list(200)
    if not rows and "$or" in filt:
        filt.pop("$or", None)
        rows = await db.businesses.find(filt, PROJECTION).to_list(200)
    rows.sort(key=lambda r: (r.get("distance_km") is None, r.get("distance_km") or 0))
    return SearchResult(intent=intent, businesses=[Business(**r) for r in rows])


# ---------------- Voice transcription ----------------
@api_router.post("/voice/transcribe", response_model=VoiceResult)
async def transcribe(file: UploadFile = File(...)):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "LLM key missing")
    data = await file.read()
    if not data:
        raise HTTPException(400, "empty audio")
    if len(data) > 25 * 1024 * 1024:
        raise HTTPException(413, "audio too large")
    # Persist to a temp file — the SDK expects a path/file-like with extension.
    suffix_map = {
        "audio/m4a": ".m4a", "audio/mp4": ".m4a", "audio/x-m4a": ".m4a",
        "audio/wav": ".wav", "audio/x-wav": ".wav",
        "audio/mpeg": ".mp3", "audio/mp3": ".mp3",
        "audio/webm": ".webm", "audio/ogg": ".ogg",
    }
    suffix = suffix_map.get((file.content_type or "").lower(), ".m4a")
    tmp_path: Optional[str] = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(data)
            tmp_path = tmp.name
        from emergentintegrations.llm.openai.speech_to_text import OpenAISpeechToText
        stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)
        resp = await stt.transcribe(file=tmp_path, model="whisper-1", response_format="verbose_json")
        # Response can be a dict-like or a litellm/openai object
        text = ""
        language = "unknown"
        try:
            text = getattr(resp, "text", None) or resp.get("text", "")  # type: ignore
        except Exception:
            text = str(resp)
        try:
            language = getattr(resp, "language", None) or resp.get("language", "unknown")  # type: ignore
        except Exception:
            pass
        lang_map = {"telugu": "te", "english": "en"}
        language = lang_map.get(str(language).lower(), str(language))
        return VoiceResult(text=(text or "").strip(), language=language)
    except Exception as e:
        logger.exception("transcribe failed")
        raise HTTPException(502, f"transcribe failed: {e}")
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


# ---------------- Auth (Emergent Google) ----------------
@api_router.post("/auth/session")
async def auth_session(body: SessionRequest):
    try:
        async with httpx.AsyncClient(timeout=15) as x:
            r = await x.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": body.session_id},
            )
        if r.status_code != 200:
            raise HTTPException(401, "invalid session")
        data = r.json()
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("auth exchange failed: %s", e)
        raise HTTPException(502, "auth service unavailable")

    email = data.get("email")
    name = data.get("name") or email
    picture = data.get("picture")
    session_token = data.get("session_token")
    if not email or not session_token:
        raise HTTPException(401, "invalid session payload")

    existing = await db.users.find_one({"email": email}, PROJECTION)
    if existing:
        user_id = existing["user_id"]
        set_fields = {"name": name, "picture": picture}
        # Backfill role
        if email.lower() in ADMIN_EMAILS and existing.get("role") != "admin":
            set_fields["role"] = "admin"
        elif email.lower() not in ADMIN_EMAILS and existing.get("role") == "admin":
            set_fields["role"] = "user"
        await db.users.update_one({"user_id": user_id}, {"$set": set_fields})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        role = "admin" if email.lower() in ADMIN_EMAILS else "user"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "role": role,
            "created_at": datetime.now(timezone.utc),
        })
    now = datetime.now(timezone.utc)
    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user_id,
        "created_at": now,
        "expires_at": now + timedelta(days=7),
    })
    user = await db.users.find_one({"user_id": user_id}, PROJECTION)
    return {"session_token": session_token, "user": user}


@api_router.get("/auth/me")
async def auth_me(authorization: Optional[str] = Header(None)):
    u = await current_user(authorization)
    if not u:
        raise HTTPException(401, "unauthenticated")
    return u


@api_router.post("/auth/logout")
async def auth_logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        await db.user_sessions.delete_one({"session_token": token})
    return {"status": "ok"}


# ---------------- Favourites ----------------
@api_router.get("/favourites")
async def list_favourites(authorization: Optional[str] = Header(None)):
    u = await require_user(authorization)
    rows = await db.favourites.find({"user_id": u["user_id"]}, PROJECTION).to_list(200)
    ids = [r["business_id"] for r in rows]
    if not ids:
        return []
    businesses = await db.businesses.find({"id": {"$in": ids}}, PROJECTION).to_list(200)
    return businesses


@api_router.post("/favourites")
async def add_favourite(body: FavouriteBody, authorization: Optional[str] = Header(None)):
    u = await require_user(authorization)
    await db.favourites.update_one(
        {"user_id": u["user_id"], "business_id": body.business_id},
        {"$set": {"user_id": u["user_id"], "business_id": body.business_id, "added_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    return {"status": "ok"}


@api_router.delete("/favourites/{business_id}")
async def remove_favourite(business_id: str, authorization: Optional[str] = Header(None)):
    u = await require_user(authorization)
    await db.favourites.delete_one({"user_id": u["user_id"], "business_id": business_id})
    return {"status": "ok"}


# ---------------- Push notifications ----------------
PUSH_BASE_URL = "https://integrations.emergentagent.com"
_push_client = httpx.AsyncClient(
    base_url=PUSH_BASE_URL,
    headers={"X-Push-Key": EMERGENT_PUSH_KEY},
    timeout=10.0,
)


async def send_push(recipients: List[str], data: dict, idempotency_key: Optional[str] = None) -> None:
    if not recipients:
        return
    if len(recipients) > 100:
        raise ValueError("max 100 recipients per /trigger call; chunk before sending")
    if "title" not in data or "message" not in data:
        raise ValueError("data must include title and message")
    payload: dict = {"recipients": recipients, "data": data}
    if idempotency_key:
        payload["$idempotency_key"] = idempotency_key
    resp = await _push_client.post("/api/v1/push/trigger", json=payload)
    if resp.status_code == 401:
        raise HTTPException(500, "EMERGENT_PUSH_KEY missing or invalid")
    if resp.status_code >= 500:
        raise HTTPException(502, "Push provider unavailable")
    resp.raise_for_status()


@api_router.post("/register-push", status_code=201)
async def register_push(body: RegisterPushBody, authorization: Optional[str] = Header(None)):
    # Anonymous devices are allowed; if user is signed in, associate with them too.
    u = await current_user(authorization)
    signed_user_id = u["user_id"] if u else body.user_id
    await db.push_tokens.update_one(
        {"device_token": body.device_token},
        {"$set": {
            "user_id": signed_user_id,
            "location_id": None,  # optional; the client may PATCH later
            "platform": body.platform,
            "device_token": body.device_token,
            "updated_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )
    try:
        resp = await _push_client.post(
            "/api/v1/push/users/register",
            json={"user_id": signed_user_id, "platform": body.platform, "device_token": body.device_token},
        )
        if resp.status_code == 401:
            logger.warning("EMERGENT_PUSH_KEY placeholder; skipping upstream register")
        elif resp.status_code >= 500:
            raise HTTPException(502, "Push provider unavailable")
        else:
            resp.raise_for_status()
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("upstream register failed (ignored in dev): %s", e)
    return {"status": "registered"}


@api_router.post("/push-tokens/{device_token}/location")
async def set_token_location(device_token: str, body: dict):
    await db.push_tokens.update_one(
        {"device_token": device_token},
        {"$set": {"location_id": body.get("location_id")}},
    )
    return {"status": "ok"}


@api_router.post("/announcements/broadcast")
async def broadcast(body: BroadcastBody):
    """Broadcast an announcement to all opted-in devices for a location."""
    tokens = await db.push_tokens.find({"location_id": body.location_id}, PROJECTION).to_list(1000)
    recipients = list({t["user_id"] for t in tokens if t.get("user_id")})
    # Also persist the update
    doc = {
        "id": _uid(),
        "location_id": body.location_id,
        "title_en": body.title, "title_te": body.title,
        "body_en": body.message, "body_te": body.message,
        "posted_at": datetime.now(timezone.utc).isoformat(),
        "tag_en": body.tag_en, "tag_te": body.tag_te,
    }
    await db.updates.insert_one(doc)
    try:
        if recipients:
            await send_push(recipients, {"title": body.title, "message": body.message, "action_url": "/section/updates"})
    except Exception as e:
        logger.warning("broadcast push failed: %s", e)
    return {"status": "ok", "recipients": len(recipients)}


# ---------------- Uploads / files ----------------
@api_router.post("/uploads")
async def upload_file(file: UploadFile = File(...), authorization: Optional[str] = Header(None)):
    u = await require_user(authorization)
    data = await file.read()
    if not data:
        raise HTTPException(400, "empty file")
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(413, "max 8MB")
    ct = (file.content_type or "application/octet-stream").lower()
    ext = ".jpg"
    if "png" in ct: ext = ".png"
    elif "webp" in ct: ext = ".webp"
    elif "heic" in ct: ext = ".heic"
    elif "gif" in ct: ext = ".gif"
    path = f"{APP_NAME}/uploads/{u['user_id']}/{uuid.uuid4().hex}{ext}"
    await run_in_threadpool(_sync_put, path, data, ct)
    return {"path": path}


@api_router.get("/files/{path:path}")
async def get_file(path: str):
    try:
        content, ct = await run_in_threadpool(_sync_get, path)
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("get_file failed: %s", e)
        raise HTTPException(404, "not found")
    return Response(content=content, media_type=ct, headers={"Cache-Control": "public, max-age=86400"})


# ---------------- Community feed ----------------
@api_router.get("/posts", response_model=List[Post])
async def list_posts(location_id: str = Query(...), limit: int = 50):
    rows = await db.posts.find({"location_id": location_id, "hidden": {"$ne": True}}, PROJECTION).to_list(limit)
    rows.sort(key=lambda r: r.get("posted_at", ""), reverse=True)
    return [Post(**r) for r in rows]


@api_router.post("/posts", response_model=Post)
async def create_post(body: PostCreate, authorization: Optional[str] = Header(None)):
    u = await require_user(authorization)
    title = body.title.strip()
    text = body.body.strip()
    if not title and not text and not body.image_path:
        raise HTTPException(400, "empty post")
    if len(title) > 120:
        raise HTTPException(400, "title too long")
    if len(text) > 2000:
        raise HTTPException(400, "body too long")
    doc = {
        "id": _uid(),
        "location_id": body.location_id,
        "user_id": u["user_id"],
        "author_name": u.get("name"),
        "author_picture": u.get("picture"),
        "title": title,
        "body": text,
        "image_path": body.image_path,
        "posted_at": datetime.now(timezone.utc).isoformat(),
        "reports": 0,
        "hidden": False,
    }
    await db.posts.insert_one(dict(doc))
    return Post(**doc)


@api_router.post("/posts/{post_id}/report")
async def report_post(post_id: str):
    res = await db.posts.find_one_and_update(
        {"id": post_id},
        {"$inc": {"reports": 1}, "$set": {"hidden_if": True}},
        return_document=True,
    )
    if not res:
        raise HTTPException(404, "post not found")
    # Auto-hide after 5 reports
    if (res.get("reports") or 0) + 1 >= 5:
        await db.posts.update_one({"id": post_id}, {"$set": {"hidden": True}})
    return {"status": "ok"}


@api_router.delete("/posts/{post_id}")
async def delete_own_post(post_id: str, authorization: Optional[str] = Header(None)):
    u = await require_user(authorization)
    row = await db.posts.find_one({"id": post_id}, PROJECTION)
    if not row:
        raise HTTPException(404, "post not found")
    if row["user_id"] != u["user_id"]:
        raise HTTPException(403, "not your post")
    await db.posts.delete_one({"id": post_id})
    return {"status": "ok"}


# ---------------- Employee / business editor ----------------
@api_router.post("/business/{business_id}/edit-login")
async def biz_edit_login(business_id: str, body: BusinessEditLogin):
    biz = await db.businesses.find_one({"id": business_id}, PROJECTION)
    if not biz:
        raise HTTPException(404, "business not found")
    if str(biz.get("edit_code", "")).strip() != body.code.strip():
        raise HTTPException(401, "invalid code")
    token = uuid.uuid4().hex
    await db.biz_edit_tokens.insert_one({
        "token": token,
        "business_id": business_id,
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=12),
    })
    return {"token": token, "business_id": business_id, "business_name": biz.get("name_en")}


async def _require_edit_token(business_id: str, x_edit_token: Optional[str]) -> None:
    if not x_edit_token:
        raise HTTPException(401, "missing edit token")
    row = await db.biz_edit_tokens.find_one({"token": x_edit_token, "business_id": business_id})
    if not row:
        raise HTTPException(401, "invalid edit token")
    exp = row.get("expires_at")
    if isinstance(exp, datetime):
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < datetime.now(timezone.utc):
            raise HTTPException(401, "expired edit token")


@api_router.put("/business/{business_id}", response_model=Business)
async def biz_update(
    business_id: str,
    body: BusinessUpdate,
    x_edit_token: Optional[str] = Header(None, alias="X-Edit-Token"),
):
    await _require_edit_token(business_id, x_edit_token)
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "nothing to update")
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    updates["verified"] = True  # Owner-edited = verified
    await db.businesses.update_one({"id": business_id}, {"$set": updates})
    await db.biz_edit_audit.insert_one({
        "business_id": business_id,
        "editor": "employee",
        "editor_ref": x_edit_token[:8] if x_edit_token else None,
        "changes": {k: v for k, v in updates.items() if k not in {"updated_at", "verified"}},
        "at": datetime.now(timezone.utc),
    })
    biz = await db.businesses.find_one({"id": business_id}, PROJECTION)
    return Business(**biz)


@api_router.get("/business/{business_id}/me", response_model=Business)
async def biz_me(business_id: str, x_edit_token: Optional[str] = Header(None, alias="X-Edit-Token")):
    await _require_edit_token(business_id, x_edit_token)
    biz = await db.businesses.find_one({"id": business_id}, PROJECTION)
    if not biz:
        raise HTTPException(404, "business not found")
    return Business(**biz)


# ---------------- Admin ----------------
async def require_admin(authorization: Optional[str] = Header(None)) -> dict:
    u = await require_user(authorization)
    if (u.get("role") or "user") != "admin":
        raise HTTPException(403, "admin only")
    return u


@api_router.get("/admin/me")
async def admin_me(authorization: Optional[str] = Header(None)):
    u = await require_admin(authorization)
    return u


@api_router.get("/admin/reported-posts")
async def admin_reported_posts(authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    rows = await db.posts.find({"$or": [{"reports": {"$gt": 0}}, {"hidden": True}]}, PROJECTION).to_list(500)
    rows.sort(key=lambda r: (r.get("hidden") is not True, -(r.get("reports") or 0)))
    return rows


@api_router.post("/admin/posts/{post_id}/hide")
async def admin_hide(post_id: str, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    r = await db.posts.update_one({"id": post_id}, {"$set": {"hidden": True}})
    if r.matched_count == 0:
        raise HTTPException(404, "post not found")
    return {"status": "ok"}


@api_router.post("/admin/posts/{post_id}/restore")
async def admin_restore(post_id: str, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    r = await db.posts.update_one({"id": post_id}, {"$set": {"hidden": False, "reports": 0}})
    if r.matched_count == 0:
        raise HTTPException(404, "post not found")
    return {"status": "ok"}


@api_router.delete("/admin/posts/{post_id}")
async def admin_delete(post_id: str, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    r = await db.posts.delete_one({"id": post_id})
    if r.deleted_count == 0:
        raise HTTPException(404, "post not found")
    return {"status": "ok"}


@api_router.get("/admin/business-codes")
async def admin_business_codes(location_id: Optional[str] = None, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    filt: dict = {}
    if location_id:
        filt["location_id"] = location_id
    rows = await db.businesses.find(filt, PROJECTION).to_list(1000)
    rows.sort(key=lambda r: (r.get("section") or "", r.get("name_en") or ""))
    return [
        {
            "id": r["id"],
            "name_en": r.get("name_en"),
            "name_te": r.get("name_te"),
            "section": r.get("section"),
            "category": r.get("category"),
            "verified": bool(r.get("verified")),
            "edit_code": r.get("edit_code"),
        }
        for r in rows
    ]


@api_router.post("/admin/announcements/broadcast")
async def admin_broadcast(body: BroadcastBody, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    return await broadcast(body)


@api_router.put("/admin/business/{business_id}", response_model=Business)
async def admin_edit_business(business_id: str, body: BusinessUpdate, authorization: Optional[str] = Header(None)):
    admin = await require_admin(authorization)
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "nothing to update")
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    r = await db.businesses.update_one({"id": business_id}, {"$set": updates})
    if r.matched_count == 0:
        raise HTTPException(404, "business not found")
    await db.biz_edit_audit.insert_one({
        "business_id": business_id,
        "editor": "admin",
        "editor_ref": admin["user_id"],
        "editor_email": admin.get("email"),
        "changes": {k: v for k, v in updates.items() if k != "updated_at"},
        "at": datetime.now(timezone.utc),
    })
    biz = await db.businesses.find_one({"id": business_id}, PROJECTION)
    return Business(**biz)


@api_router.get("/admin/business/{business_id}/audit")
async def admin_business_audit(business_id: str, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    rows = await db.biz_edit_audit.find({"business_id": business_id}, PROJECTION).to_list(200)
    rows.sort(key=lambda r: r.get("at") or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    # Serialize datetime
    out = []
    for r in rows:
        at = r.get("at")
        out.append({
            **{k: v for k, v in r.items() if k != "at"},
            "at": at.isoformat() if isinstance(at, datetime) else at,
        })
    return out


@api_router.get("/admin/audit")
async def admin_full_audit(limit: int = 100, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    rows = await db.biz_edit_audit.find({}, PROJECTION).to_list(limit)
    rows.sort(key=lambda r: r.get("at") or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    ids = list({r["business_id"] for r in rows})
    biz_map = {b["id"]: b for b in await db.businesses.find({"id": {"$in": ids}}, PROJECTION).to_list(1000)}
    out = []
    for r in rows:
        at = r.get("at")
        b = biz_map.get(r["business_id"])
        out.append({
            **{k: v for k, v in r.items() if k != "at"},
            "at": at.isoformat() if isinstance(at, datetime) else at,
            "business_name": b.get("name_en") if b else None,
        })
    return out


# ---------------- Startup ----------------
@app.on_event("startup")
async def on_start():
    await seed_if_empty()
    try:
        await run_in_threadpool(_sync_init_storage)
    except Exception as e:
        logger.warning("storage warm-up failed: %s", e)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    await _push_client.aclose()


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
