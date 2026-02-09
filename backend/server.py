from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import requests
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
from googleapiclient.discovery import build
import warnings

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Google OAuth config
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://vacation-hub-62.preview.emergentagent.com')

# Scopes for Gmail and Calendar
GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/calendar",
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile"
]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

# Holiday Categories
HOLIDAY_CATEGORIES = [
    {"id": "paid_holiday", "name": "Paid Holidays", "description": "Regular paid time off"},
    {"id": "unpaid_leave", "name": "Unpaid Leave", "description": "Leave without pay"},
    {"id": "sick_leave", "name": "Sick Leave (No Justification)", "description": "Sick leave without medical certificate"},
    {"id": "parental_leave", "name": "Parental Leave", "description": "Leave for parental duties"},
    {"id": "maternity_leave", "name": "Maternity Leave", "description": "Leave for maternity/paternity"}
]

# Default credits per category
DEFAULT_CREDITS = {
    "paid_holiday": 35.0,
    "unpaid_leave": 0.0,  # Usually unlimited but tracked
    "sick_leave": 5.0,
    "parental_leave": 10.0,
    "maternity_leave": 90.0
}

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: str = "employee"  # employee or hr
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    session_id: str
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class HolidayRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    request_id: str = Field(default_factory=lambda: f"req_{uuid.uuid4().hex[:12]}")
    user_id: str
    user_name: str
    user_email: str
    category: str = "paid_holiday"  # Holiday category
    start_date: str  # ISO date string
    end_date: str
    days_count: float
    reason: str
    status: str = "pending"  # pending, approved, rejected
    hr_comment: Optional[str] = None
    processed_by: Optional[str] = None
    processed_at: Optional[datetime] = None
    calendar_event_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class HolidayRequestCreate(BaseModel):
    category: str = "paid_holiday"
    start_date: str
    end_date: str
    days_count: float
    reason: str

class HolidayCredit(BaseModel):
    model_config = ConfigDict(extra="ignore")
    credit_id: str = Field(default_factory=lambda: f"cred_{uuid.uuid4().hex[:12]}")
    user_id: str
    user_email: str
    user_name: str
    year: int
    category: str = "paid_holiday"
    total_days: float = 35.0
    used_days: float = 0.0
    remaining_days: float = 35.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class HolidayCreditCreate(BaseModel):
    user_id: str
    year: int
    category: str = "paid_holiday"
    total_days: float = 35.0

class PublicHoliday(BaseModel):
    model_config = ConfigDict(extra="ignore")
    holiday_id: str = Field(default_factory=lambda: f"ph_{uuid.uuid4().hex[:12]}")
    name: str
    date: str  # ISO date string
    year: int
    calendar_event_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PublicHolidayCreate(BaseModel):
    name: str
    date: str
    year: int

class AppSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    settings_id: str = "app_settings"
    email_notifications_enabled: bool = True
    calendar_sync_enabled: bool = True
    notification_email: Optional[str] = None
    google_tokens: Optional[dict] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GoogleOAuthToken(BaseModel):
    model_config = ConfigDict(extra="ignore")
    token_id: str = Field(default_factory=lambda: f"token_{uuid.uuid4().hex[:12]}")
    user_id: str
    access_token: str
    refresh_token: Optional[str] = None
    expires_at: datetime
    token_uri: str = "https://oauth2.googleapis.com/token"
    client_id: str
    client_secret: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== HELPER FUNCTIONS ====================

async def get_current_user(request: Request) -> User:
    """Get current user from session token in cookies or Authorization header"""
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user)

async def get_hr_user(request: Request) -> User:
    """Get current user and verify they are HR"""
    user = await get_current_user(request)
    if user.role != "hr":
        raise HTTPException(status_code=403, detail="HR access required")
    return user

async def get_google_creds():
    """Get Google credentials from settings for sending emails/calendar"""
    settings = await db.settings.find_one({"settings_id": "app_settings"}, {"_id": 0})
    if not settings or not settings.get("google_tokens"):
        return None
    
    tokens = settings["google_tokens"]
    creds = Credentials(
        token=tokens.get("access_token"),
        refresh_token=tokens.get("refresh_token"),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET
    )
    
    # Check if expired and refresh
    expires_at = tokens.get("expires_at")
    if expires_at:
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        
        if datetime.now(timezone.utc) >= expires_at and creds.refresh_token:
            try:
                creds.refresh(GoogleRequest())
                # Update tokens in DB
                await db.settings.update_one(
                    {"settings_id": "app_settings"},
                    {"$set": {
                        "google_tokens.access_token": creds.token,
                        "google_tokens.expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
                    }}
                )
            except Exception as e:
                logger.error(f"Failed to refresh token: {e}")
                return None
    
    return creds

async def send_email_notification(to_email: str, subject: str, body: str):
    """Send email notification via Gmail API"""
    settings = await db.settings.find_one({"settings_id": "app_settings"}, {"_id": 0})
    if not settings or not settings.get("email_notifications_enabled", True):
        return False
    
    creds = await get_google_creds()
    if not creds:
        logger.warning("No Google credentials configured for email")
        return False
    
    try:
        service = build('gmail', 'v1', credentials=creds)
        message = MIMEMultipart()
        message['to'] = to_email
        message['subject'] = subject
        message.attach(MIMEText(body, 'html'))
        
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        service.users().messages().send(userId='me', body={'raw': raw}).execute()
        logger.info(f"Email sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False

async def create_calendar_event(summary: str, start_date: str, end_date: str, description: str = ""):
    """Create a calendar event for approved holidays"""
    settings = await db.settings.find_one({"settings_id": "app_settings"}, {"_id": 0})
    if not settings or not settings.get("calendar_sync_enabled", True):
        return None
    
    creds = await get_google_creds()
    if not creds:
        logger.warning("No Google credentials configured for calendar")
        return None
    
    try:
        service = build('calendar', 'v3', credentials=creds)
        event = {
            'summary': summary,
            'description': description,
            'start': {'date': start_date},
            'end': {'date': end_date},
        }
        result = service.events().insert(calendarId='primary', body=event).execute()
        logger.info(f"Calendar event created: {result.get('id')}")
        return result.get('id')
    except Exception as e:
        logger.error(f"Failed to create calendar event: {e}")
        return None

async def delete_calendar_event(event_id: str):
    """Delete a calendar event"""
    creds = await get_google_creds()
    if not creds or not event_id:
        return False
    
    try:
        service = build('calendar', 'v3', credentials=creds)
        service.events().delete(calendarId='primary', eventId=event_id).execute()
        return True
    except Exception as e:
        logger.error(f"Failed to delete calendar event: {e}")
        return False

# ==================== AUTH ROUTES ====================

@api_router.get("/auth/session")
async def process_session(session_id: str, response: Response):
    """Exchange session_id for user data and set session cookie"""
    try:
        # Get session data from Emergent Auth
        resp = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        data = resp.json()
        email = data.get("email")
        name = data.get("name")
        picture = data.get("picture")
        session_token = data.get("session_token")
        
        # Check if user exists
        existing_user = await db.users.find_one({"email": email}, {"_id": 0})
        if existing_user:
            user_id = existing_user["user_id"]
            # Update user info
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {"name": name, "picture": picture}}
            )
        else:
            # Create new user
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            new_user = {
                "user_id": user_id,
                "email": email,
                "name": name,
                "picture": picture,
                "role": "employee",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(new_user)
            
            # Create default holiday credits for all categories
            current_year = datetime.now().year
            for cat_id, default_days in DEFAULT_CREDITS.items():
                credit = {
                    "credit_id": f"cred_{uuid.uuid4().hex[:12]}",
                    "user_id": user_id,
                    "user_email": email,
                    "user_name": name,
                    "year": current_year,
                    "category": cat_id,
                    "total_days": default_days,
                    "used_days": 0.0,
                    "remaining_days": default_days,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                await db.holiday_credits.insert_one(credit)
        
        # Store session
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        session_doc = {
            "session_id": f"sess_{uuid.uuid4().hex[:12]}",
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.user_sessions.insert_one(session_doc)
        
        # Set cookie
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=True,
            samesite="none",
            path="/",
            max_age=7*24*60*60
        )
        
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        return user
        
    except Exception as e:
        logger.error(f"Session processing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/auth/me")
async def get_current_user_info(user: User = Depends(get_current_user)):
    """Get current authenticated user"""
    return user.model_dump()

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout and clear session"""
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# ==================== HOLIDAY REQUEST ROUTES ====================

@api_router.get("/categories")
async def get_holiday_categories():
    """Get all holiday categories"""
    return HOLIDAY_CATEGORIES

@api_router.post("/requests", response_model=dict, status_code=201)
async def create_holiday_request(req: HolidayRequestCreate, user: User = Depends(get_current_user)):
    """Create a new holiday request"""
    # Validate category
    valid_categories = [c["id"] for c in HOLIDAY_CATEGORIES]
    if req.category not in valid_categories:
        raise HTTPException(status_code=400, detail="Invalid holiday category")
    
    # Check if user has enough credits for this category
    current_year = datetime.now().year
    credit = await db.holiday_credits.find_one(
        {"user_id": user.user_id, "year": current_year, "category": req.category}, {"_id": 0}
    )
    
    # Get category name for display
    category_name = next((c["name"] for c in HOLIDAY_CATEGORIES if c["id"] == req.category), req.category)
    
    if not credit:
        raise HTTPException(status_code=400, detail=f"No credits assigned for {category_name}")
    
    if credit["remaining_days"] < req.days_count:
        raise HTTPException(status_code=400, detail=f"Insufficient {category_name} credits. Available: {credit['remaining_days']} days")
    
    # Create request
    request_doc = {
        "request_id": f"req_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "user_name": user.name,
        "user_email": user.email,
        "category": req.category,
        "start_date": req.start_date,
        "end_date": req.end_date,
        "days_count": req.days_count,
        "reason": req.reason,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.holiday_requests.insert_one(request_doc)
    
    # Send notification to HR
    hr_users = await db.users.find({"role": "hr"}, {"_id": 0}).to_list(100)
    for hr in hr_users:
        await send_email_notification(
            hr["email"],
            f"New {category_name} Request from {user.name}",
            f"""
            <h2>New Holiday Request</h2>
            <p><strong>Employee:</strong> {user.name}</p>
            <p><strong>Category:</strong> {category_name}</p>
            <p><strong>Dates:</strong> {req.start_date} to {req.end_date}</p>
            <p><strong>Days:</strong> {req.days_count}</p>
            <p><strong>Reason:</strong> {req.reason}</p>
            <p>Please review this request in the Holiday Management System.</p>
            """
        )
    
    return {"message": "Request created successfully", "request_id": request_doc["request_id"]}

@api_router.get("/requests/my")
async def get_my_requests(user: User = Depends(get_current_user)):
    """Get current user's holiday requests"""
    requests = await db.holiday_requests.find(
        {"user_id": user.user_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    return requests

@api_router.get("/requests/all")
async def get_all_requests(user: User = Depends(get_hr_user)):
    """Get all holiday requests (HR only)"""
    requests = await db.holiday_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return requests

@api_router.get("/requests/pending")
async def get_pending_requests(user: User = Depends(get_hr_user)):
    """Get pending holiday requests (HR only)"""
    requests = await db.holiday_requests.find({"status": "pending"}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return requests

@api_router.put("/requests/{request_id}/approve")
async def approve_request(request_id: str, hr_comment: Optional[str] = None, user: User = Depends(get_hr_user)):
    """Approve a holiday request (HR only)"""
    req = await db.holiday_requests.find_one({"request_id": request_id}, {"_id": 0})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if req["status"] != "pending":
        raise HTTPException(status_code=400, detail="Request already processed")
    
    # Update credit for the specific category
    current_year = datetime.now().year
    category = req.get("category", "paid_holiday")
    await db.holiday_credits.update_one(
        {"user_id": req["user_id"], "year": current_year, "category": category},
        {
            "$inc": {"used_days": req["days_count"], "remaining_days": -req["days_count"]},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    # Get category name for calendar
    category_name = next((c["name"] for c in HOLIDAY_CATEGORIES if c["id"] == category), category)
    
    # Create calendar event
    event_id = await create_calendar_event(
        f"{category_name}: {req['user_name']}",
        req["start_date"],
        req["end_date"],
        req.get("reason", "")
    )
    
    # Update request
    await db.holiday_requests.update_one(
        {"request_id": request_id},
        {"$set": {
            "status": "approved",
            "hr_comment": hr_comment,
            "processed_by": user.user_id,
            "processed_at": datetime.now(timezone.utc).isoformat(),
            "calendar_event_id": event_id
        }}
    )
    
    # Notify employee
    await send_email_notification(
        req["user_email"],
        f"Your {category_name} Request has been Approved",
        f"""
        <h2>{category_name} Request Approved</h2>
        <p>Your request has been approved!</p>
        <p><strong>Category:</strong> {category_name}</p>
        <p><strong>Dates:</strong> {req['start_date']} to {req['end_date']}</p>
        <p><strong>Days:</strong> {req['days_count']}</p>
        {f'<p><strong>HR Comment:</strong> {hr_comment}</p>' if hr_comment else ''}
        """
    )
    
    return {"message": "Request approved successfully"}

@api_router.put("/requests/{request_id}/reject")
async def reject_request(request_id: str, hr_comment: Optional[str] = None, user: User = Depends(get_hr_user)):
    """Reject a holiday request (HR only)"""
    req = await db.holiday_requests.find_one({"request_id": request_id}, {"_id": 0})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if req["status"] != "pending":
        raise HTTPException(status_code=400, detail="Request already processed")
    
    await db.holiday_requests.update_one(
        {"request_id": request_id},
        {"$set": {
            "status": "rejected",
            "hr_comment": hr_comment,
            "processed_by": user.user_id,
            "processed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Notify employee
    await send_email_notification(
        req["user_email"],
        "Your Holiday Request has been Rejected",
        f"""
        <h2>Holiday Request Rejected</h2>
        <p>Unfortunately, your holiday request has been rejected.</p>
        <p><strong>Dates:</strong> {req['start_date']} to {req['end_date']}</p>
        <p><strong>Days:</strong> {req['days_count']}</p>
        {f'<p><strong>HR Comment:</strong> {hr_comment}</p>' if hr_comment else ''}
        <p>Please contact HR for more information.</p>
        """
    )
    
    return {"message": "Request rejected successfully"}

# ==================== HOLIDAY CREDITS ROUTES ====================

@api_router.get("/credits/my")
async def get_my_credits(user: User = Depends(get_current_user)):
    """Get current user's holiday credits"""
    credits = await db.holiday_credits.find(
        {"user_id": user.user_id}, {"_id": 0}
    ).sort([("year", -1), ("category", 1)]).to_list(100)
    
    # Add category name to each credit
    for credit in credits:
        category_info = next((c for c in HOLIDAY_CATEGORIES if c["id"] == credit.get("category", "paid_holiday")), None)
        credit["category_name"] = category_info["name"] if category_info else credit.get("category", "Paid Holidays")
    
    return credits

@api_router.get("/credits/user/{user_id}")
async def get_user_credits(user_id: str, year: Optional[int] = None, current_user: User = Depends(get_hr_user)):
    """Get specific user's holiday credits (HR only)"""
    query = {"user_id": user_id}
    if year:
        query["year"] = year
    
    credits = await db.holiday_credits.find(query, {"_id": 0}).sort([("year", -1), ("category", 1)]).to_list(100)
    
    # Add category name to each credit
    for credit in credits:
        category_info = next((c for c in HOLIDAY_CATEGORIES if c["id"] == credit.get("category", "paid_holiday")), None)
        credit["category_name"] = category_info["name"] if category_info else credit.get("category", "Paid Holidays")
    
    return credits

@api_router.get("/credits/all")
async def get_all_credits(user: User = Depends(get_hr_user)):
    """Get all users' holiday credits (HR only)"""
    credits = await db.holiday_credits.find({}, {"_id": 0}).sort([("year", -1), ("user_name", 1), ("category", 1)]).to_list(5000)
    
    # Add category name to each credit
    for credit in credits:
        category_info = next((c for c in HOLIDAY_CATEGORIES if c["id"] == credit.get("category", "paid_holiday")), None)
        credit["category_name"] = category_info["name"] if category_info else credit.get("category", "Paid Holidays")
    
    return credits

@api_router.post("/credits")
async def create_or_update_credit(credit: HolidayCreditCreate, user: User = Depends(get_hr_user)):
    """Create or update holiday credit for a user (HR only)"""
    target_user = await db.users.find_one({"user_id": credit.user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate category
    valid_categories = [c["id"] for c in HOLIDAY_CATEGORIES]
    if credit.category not in valid_categories:
        raise HTTPException(status_code=400, detail="Invalid holiday category")
    
    category_name = next((c["name"] for c in HOLIDAY_CATEGORIES if c["id"] == credit.category), credit.category)
    
    existing = await db.holiday_credits.find_one(
        {"user_id": credit.user_id, "year": credit.year, "category": credit.category}, {"_id": 0}
    )
    
    if existing:
        # Update existing credit
        new_remaining = credit.total_days - existing["used_days"]
        await db.holiday_credits.update_one(
            {"user_id": credit.user_id, "year": credit.year, "category": credit.category},
            {"$set": {
                "total_days": credit.total_days,
                "remaining_days": new_remaining,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    else:
        # Create new credit
        credit_doc = {
            "credit_id": f"cred_{uuid.uuid4().hex[:12]}",
            "user_id": credit.user_id,
            "user_email": target_user["email"],
            "user_name": target_user["name"],
            "year": credit.year,
            "category": credit.category,
            "total_days": credit.total_days,
            "used_days": 0.0,
            "remaining_days": credit.total_days,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.holiday_credits.insert_one(credit_doc)
    
    # Notify employee
    await send_email_notification(
        target_user["email"],
        f"{category_name} Credits Updated for {credit.year}",
        f"""
        <h2>{category_name} Credits Updated</h2>
        <p>Your {category_name} credits for {credit.year} have been updated.</p>
        <p><strong>Total Days:</strong> {credit.total_days}</p>
        """
    )
    
    return {"message": "Credit updated successfully"}

class CreditAdjustment(BaseModel):
    user_id: str
    year: int
    category: str
    adjustment: float  # Positive to add days, negative to reduce days
    reason: str = ""

@api_router.put("/credits/adjust")
async def adjust_credit(adjustment: CreditAdjustment, current_user: User = Depends(get_hr_user)):
    """Adjust (add or reduce) holiday credits for a user (HR only)"""
    # Find the credit
    credit = await db.holiday_credits.find_one(
        {"user_id": adjustment.user_id, "year": adjustment.year, "category": adjustment.category},
        {"_id": 0}
    )
    
    if not credit:
        raise HTTPException(status_code=404, detail="Credit not found for this user/year/category")
    
    # Calculate new values
    new_remaining = credit["remaining_days"] + adjustment.adjustment
    new_used = credit["used_days"] - adjustment.adjustment  # If reducing remaining, increase used
    
    # Validate
    if new_remaining < 0:
        raise HTTPException(status_code=400, detail=f"Cannot reduce more than available. Current remaining: {credit['remaining_days']} days")
    
    if new_used < 0:
        new_used = 0  # Don't allow negative used days
    
    if new_remaining > credit["total_days"]:
        # If adding more than total, also increase total
        new_total = new_remaining
    else:
        new_total = credit["total_days"]
    
    # Update credit
    await db.holiday_credits.update_one(
        {"user_id": adjustment.user_id, "year": adjustment.year, "category": adjustment.category},
        {"$set": {
            "total_days": new_total,
            "used_days": new_used,
            "remaining_days": new_remaining,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Get category name and user info for notification
    category_name = next((c["name"] for c in HOLIDAY_CATEGORIES if c["id"] == adjustment.category), adjustment.category)
    target_user = await db.users.find_one({"user_id": adjustment.user_id}, {"_id": 0})
    
    # Notify employee
    if target_user:
        action = "increased" if adjustment.adjustment > 0 else "reduced"
        await send_email_notification(
            target_user["email"],
            f"{category_name} Credits Adjusted for {adjustment.year}",
            f"""
            <h2>{category_name} Credits Adjusted</h2>
            <p>Your {category_name} credits for {adjustment.year} have been {action} by {abs(adjustment.adjustment)} day(s).</p>
            <p><strong>New Balance:</strong> {new_remaining} days remaining</p>
            {f'<p><strong>Reason:</strong> {adjustment.reason}</p>' if adjustment.reason else ''}
            """
        )
    
    return {
        "message": "Credit adjusted successfully",
        "new_remaining": new_remaining,
        "new_used": new_used,
        "new_total": new_total
    }

# ==================== PUBLIC HOLIDAYS ROUTES ====================

@api_router.get("/public-holidays")
async def get_public_holidays(year: Optional[int] = None, user: User = Depends(get_current_user)):
    """Get public holidays for a year"""
    query = {"year": year} if year else {}
    holidays = await db.public_holidays.find(query, {"_id": 0}).sort("date", 1).to_list(100)
    return holidays

@api_router.post("/public-holidays")
async def create_public_holiday(holiday: PublicHolidayCreate, user: User = Depends(get_hr_user)):
    """Create a public holiday (HR only)"""
    # Create calendar event
    event_id = await create_calendar_event(
        f"Public Holiday: {holiday.name}",
        holiday.date,
        holiday.date,
        "Public Holiday"
    )
    
    holiday_doc = {
        "holiday_id": f"ph_{uuid.uuid4().hex[:12]}",
        "name": holiday.name,
        "date": holiday.date,
        "year": holiday.year,
        "calendar_event_id": event_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.public_holidays.insert_one(holiday_doc)
    
    return {"message": "Public holiday created", "holiday_id": holiday_doc["holiday_id"]}

@api_router.delete("/public-holidays/{holiday_id}")
async def delete_public_holiday(holiday_id: str, user: User = Depends(get_hr_user)):
    """Delete a public holiday (HR only)"""
    holiday = await db.public_holidays.find_one({"holiday_id": holiday_id}, {"_id": 0})
    if not holiday:
        raise HTTPException(status_code=404, detail="Holiday not found")
    
    # Delete calendar event
    if holiday.get("calendar_event_id"):
        await delete_calendar_event(holiday["calendar_event_id"])
    
    await db.public_holidays.delete_one({"holiday_id": holiday_id})
    return {"message": "Public holiday deleted"}

# ==================== CALENDAR ROUTES ====================

@api_router.get("/calendar/events")
async def get_calendar_events(year: int, month: int, user: User = Depends(get_current_user)):
    """Get calendar events (approved holidays + public holidays)"""
    # Get approved holidays
    start_date = f"{year}-{month:02d}-01"
    if month == 12:
        end_date = f"{year+1}-01-01"
    else:
        end_date = f"{year}-{month+1:02d}-01"
    
    holidays = await db.holiday_requests.find({
        "status": "approved",
        "start_date": {"$gte": start_date, "$lt": end_date}
    }, {"_id": 0}).to_list(1000)
    
    public_holidays = await db.public_holidays.find({
        "date": {"$gte": start_date, "$lt": end_date}
    }, {"_id": 0}).to_list(100)
    
    events = []
    for h in holidays:
        category = h.get("category", "paid_holiday")
        category_name = next((c["name"] for c in HOLIDAY_CATEGORIES if c["id"] == category), category)
        events.append({
            "id": h["request_id"],
            "title": f"{h['user_name']} - {category_name}",
            "start": h["start_date"],
            "end": h["end_date"],
            "type": "holiday",
            "category": category,
            "user_name": h["user_name"]
        })
    
    for ph in public_holidays:
        events.append({
            "id": ph["holiday_id"],
            "title": ph["name"],
            "start": ph["date"],
            "end": ph["date"],
            "type": "public_holiday"
        })
    
    return events

# ==================== USERS ROUTES ====================

@api_router.get("/users")
async def get_all_users(user: User = Depends(get_hr_user)):
    """Get all users (HR only)"""
    users = await db.users.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    return users

@api_router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, role: str, current_user: User = Depends(get_hr_user)):
    """Update user role (HR only)"""
    if role not in ["employee", "hr"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"role": role}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "Role updated successfully"}

class UserCreate(BaseModel):
    email: str
    name: str
    role: str = "employee"

@api_router.post("/users", status_code=201)
async def create_user(user_data: UserCreate, current_user: User = Depends(get_hr_user)):
    """Create a new user (HR only)"""
    # Check if user already exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    if user_data.role not in ["employee", "hr"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    new_user = {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "picture": None,
        "role": user_data.role,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(new_user)
    
    # Create default holiday credits for all categories
    current_year = datetime.now().year
    for cat_id, default_days in DEFAULT_CREDITS.items():
        credit = {
            "credit_id": f"cred_{uuid.uuid4().hex[:12]}",
            "user_id": user_id,
            "user_email": user_data.email,
            "user_name": user_data.name,
            "year": current_year,
            "category": cat_id,
            "total_days": default_days,
            "used_days": 0.0,
            "remaining_days": default_days,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.holiday_credits.insert_one(credit)
    
    return {"message": "User created successfully", "user_id": user_id}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(get_hr_user)):
    """Delete a user (HR only)"""
    # Prevent deleting yourself
    if user_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    # Check if user exists
    user_to_delete = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user_to_delete:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Delete user
    await db.users.delete_one({"user_id": user_id})
    
    # Delete user's sessions
    await db.user_sessions.delete_many({"user_id": user_id})
    
    # Delete user's holiday credits
    await db.holiday_credits.delete_many({"user_id": user_id})
    
    # Delete user's holiday requests
    await db.holiday_requests.delete_many({"user_id": user_id})
    
    return {"message": "User deleted successfully"}

# ==================== SETTINGS ROUTES ====================

@api_router.get("/settings")
async def get_settings(user: User = Depends(get_hr_user)):
    """Get app settings (HR only)"""
    settings = await db.settings.find_one({"settings_id": "app_settings"}, {"_id": 0})
    if not settings:
        settings = {
            "settings_id": "app_settings",
            "email_notifications_enabled": True,
            "calendar_sync_enabled": True,
            "google_connected": False
        }
    else:
        settings["google_connected"] = bool(settings.get("google_tokens"))
    return settings

@api_router.put("/settings")
async def update_settings(
    email_notifications_enabled: bool = True,
    calendar_sync_enabled: bool = True,
    user: User = Depends(get_hr_user)
):
    """Update app settings (HR only)"""
    await db.settings.update_one(
        {"settings_id": "app_settings"},
        {"$set": {
            "email_notifications_enabled": email_notifications_enabled,
            "calendar_sync_enabled": calendar_sync_enabled,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"message": "Settings updated successfully"}

# ==================== GOOGLE OAUTH FOR GMAIL/CALENDAR ====================

@api_router.get("/oauth/google/login")
async def google_oauth_login(request: Request, user: User = Depends(get_hr_user)):
    """Initiate Google OAuth for Gmail/Calendar access (HR only)"""
    from google_auth_oauthlib.flow import Flow
    
    redirect_uri = f"{FRONTEND_URL}/api/oauth/google/callback"
    
    flow = Flow.from_client_config({
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token"
        }
    }, scopes=GOOGLE_SCOPES, redirect_uri=redirect_uri)
    
    auth_url, state = flow.authorization_url(
        access_type='offline',
        prompt='consent'
    )
    
    # Store state
    await db.oauth_states.insert_one({
        "state": state,
        "user_id": user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"authorization_url": auth_url}

@api_router.get("/oauth/google/callback")
async def google_oauth_callback(code: str, state: str):
    """Handle Google OAuth callback"""
    # Verify state
    state_doc = await db.oauth_states.find_one({"state": state})
    if not state_doc:
        raise HTTPException(status_code=400, detail="Invalid state")
    
    await db.oauth_states.delete_one({"state": state})
    
    # Exchange code for tokens
    redirect_uri = f"{FRONTEND_URL}/api/oauth/google/callback"
    
    token_resp = requests.post('https://oauth2.googleapis.com/token', data={
        'code': code,
        'client_id': GOOGLE_CLIENT_ID,
        'client_secret': GOOGLE_CLIENT_SECRET,
        'redirect_uri': redirect_uri,
        'grant_type': 'authorization_code'
    }).json()
    
    if 'error' in token_resp:
        raise HTTPException(status_code=400, detail=token_resp.get('error_description', 'OAuth failed'))
    
    # Save tokens to settings
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=token_resp.get('expires_in', 3600))
    
    await db.settings.update_one(
        {"settings_id": "app_settings"},
        {"$set": {
            "google_tokens": {
                "access_token": token_resp["access_token"],
                "refresh_token": token_resp.get("refresh_token"),
                "expires_at": expires_at.isoformat()
            },
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    # Redirect back to settings page
    return RedirectResponse(f"{FRONTEND_URL}/settings?google_connected=true")

@api_router.post("/oauth/google/disconnect")
async def google_oauth_disconnect(user: User = Depends(get_hr_user)):
    """Disconnect Google integration (HR only)"""
    await db.settings.update_one(
        {"settings_id": "app_settings"},
        {"$set": {
            "google_tokens": None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"message": "Google disconnected successfully"}

# ==================== ROOT ====================

@api_router.get("/")
async def root():
    return {"message": "Holiday Management API"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
