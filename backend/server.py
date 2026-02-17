from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, Request
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
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_EXPIRY_HOURS = int(os.environ.get('JWT_EXPIRY_HOURS', '24'))

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ─── Pydantic Models ───

class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: str = "employee"

class UserLogin(BaseModel):
    email: str
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None

class TaskCreate(BaseModel):
    title: str
    description: str = ""
    priority: str = "medium"
    deadline: Optional[str] = None
    assignedTo: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    deadline: Optional[str] = None
    assignedTo: Optional[str] = None

class TaskStatusUpdate(BaseModel):
    status: str

# ─── Utility Functions ───

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ─── Auth Middleware ───

async def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header.split(" ")[1]
    payload = decode_token(token)
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.get("isActive", True):
        raise HTTPException(status_code=403, detail="Access Denied - Account deactivated")
    return user

def require_role(*roles):
    async def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return role_checker

# ─── Auth Routes ───

@api_router.post("/auth/register")
async def register(data: UserCreate):
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = {
        "id": str(uuid.uuid4()),
        "email": data.email,
        "password": hash_password(data.password),
        "name": data.name,
        "role": data.role if data.role in ["admin", "manager", "employee"] else "employee",
        "isActive": True,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "updatedAt": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    token = create_token(user["id"], user["role"])
    return {
        "token": token,
        "user": {k: v for k, v in user.items() if k not in ["password", "_id"]}
    }

@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.get("isActive", True):
        raise HTTPException(status_code=403, detail="Access Denied - Account deactivated")
    if not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(user["id"], user["role"])
    return {
        "token": token,
        "user": {k: v for k, v in user.items() if k not in ["password", "_id"]}
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {k: v for k, v in current_user.items() if k not in ["password", "_id"]}

# ─── User Management Routes (Admin only) ───

@api_router.get("/users")
async def get_users(current_user: dict = Depends(require_role("admin", "manager"))):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return users

@api_router.get("/users/{user_id}")
async def get_user(user_id: str, current_user: dict = Depends(require_role("admin"))):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, data: UserUpdate, current_user: dict = Depends(require_role("admin"))):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    update_data["updatedAt"] = datetime.now(timezone.utc).isoformat()
    result = await db.users.update_one({"id": user_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    return user

@api_router.put("/users/{user_id}/toggle-active")
async def toggle_user_active(user_id: str, current_user: dict = Depends(require_role("admin"))):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user["id"] == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
    new_status = not user.get("isActive", True)
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"isActive": new_status, "updatedAt": datetime.now(timezone.utc).isoformat()}}
    )
    return {"isActive": new_status, "message": f"User {'activated' if new_status else 'deactivated'}"}

@api_router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, data: dict, current_user: dict = Depends(require_role("admin"))):
    role = data.get("role")
    if role not in ["admin", "manager", "employee"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"role": role, "updatedAt": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"role": role, "message": f"Role updated to {role}"}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(require_role("admin"))):
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    # Also delete tasks assigned to this user
    await db.tasks.delete_many({"assignedTo": user_id})
    return {"message": "User deleted"}

# ─── Task Routes ───

@api_router.post("/tasks")
async def create_task(data: TaskCreate, current_user: dict = Depends(require_role("admin", "manager"))):
    task = {
        "id": str(uuid.uuid4()),
        "title": data.title,
        "description": data.description,
        "status": "pending",
        "priority": data.priority if data.priority in ["low", "medium", "high", "critical"] else "medium",
        "deadline": data.deadline,
        "assignedTo": data.assignedTo,
        "createdBy": current_user["id"],
        "createdByName": current_user["name"],
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "updatedAt": datetime.now(timezone.utc).isoformat()
    }
    await db.tasks.insert_one(task)
    task.pop("_id", None)
    return task

@api_router.get("/tasks")
async def get_tasks(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assignedTo: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if current_user["role"] == "employee":
        query["assignedTo"] = current_user["id"]
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    if assignedTo and current_user["role"] != "employee":
        query["assignedTo"] = assignedTo
    tasks = await db.tasks.find(query, {"_id": 0}).to_list(1000)
    # Enrich with assignee names
    user_ids = list(set(t.get("assignedTo") for t in tasks if t.get("assignedTo")))
    if user_ids:
        users = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)
        user_map = {u["id"]: u["name"] for u in users}
        for t in tasks:
            t["assignedToName"] = user_map.get(t.get("assignedTo"), "Unassigned")
    return tasks

@api_router.get("/tasks/{task_id}")
async def get_task(task_id: str, current_user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if current_user["role"] == "employee" and task.get("assignedTo") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not your task")
    return task

@api_router.put("/tasks/{task_id}")
async def update_task(task_id: str, data: TaskUpdate, current_user: dict = Depends(require_role("admin", "manager"))):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    update_data["updatedAt"] = datetime.now(timezone.utc).isoformat()
    result = await db.tasks.update_one({"id": task_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    return task

@api_router.put("/tasks/{task_id}/status")
async def update_task_status(task_id: str, data: TaskStatusUpdate, current_user: dict = Depends(get_current_user)):
    valid_statuses = ["pending", "in_progress", "review", "completed"]
    if data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    # Employees can only update their own tasks
    if current_user["role"] == "employee" and task.get("assignedTo") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not your task")
    await db.tasks.update_one(
        {"id": task_id},
        {"$set": {"status": data.status, "updatedAt": datetime.now(timezone.utc).isoformat()}}
    )
    updated = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    return updated

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, current_user: dict = Depends(require_role("admin", "manager"))):
    result = await db.tasks.delete_one({"id": task_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted"}

# ─── Dashboard Routes ───

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "employee":
        # Employee only sees their stats
        my_tasks = await db.tasks.find({"assignedTo": current_user["id"]}, {"_id": 0}).to_list(1000)
        total = len(my_tasks)
        pending = sum(1 for t in my_tasks if t["status"] == "pending")
        in_progress = sum(1 for t in my_tasks if t["status"] == "in_progress")
        review = sum(1 for t in my_tasks if t["status"] == "review")
        completed = sum(1 for t in my_tasks if t["status"] == "completed")
        overdue = sum(1 for t in my_tasks if t.get("deadline") and t["deadline"] < datetime.now(timezone.utc).isoformat() and t["status"] != "completed")
        return {
            "totalTasks": total,
            "pending": pending,
            "inProgress": in_progress,
            "review": review,
            "completed": completed,
            "overdue": overdue
        }
    # Admin/Manager stats
    total_users = await db.users.count_documents({})
    active_users = await db.users.count_documents({"isActive": True})
    inactive_users = total_users - active_users
    all_tasks = await db.tasks.find({}, {"_id": 0}).to_list(1000)
    total_tasks = len(all_tasks)
    pending = sum(1 for t in all_tasks if t["status"] == "pending")
    in_progress = sum(1 for t in all_tasks if t["status"] == "in_progress")
    review = sum(1 for t in all_tasks if t["status"] == "review")
    completed = sum(1 for t in all_tasks if t["status"] == "completed")
    overdue = sum(1 for t in all_tasks if t.get("deadline") and t["deadline"] < datetime.now(timezone.utc).isoformat() and t["status"] != "completed")
    # Role distribution
    admins = await db.users.count_documents({"role": "admin"})
    managers = await db.users.count_documents({"role": "manager"})
    employees = await db.users.count_documents({"role": "employee"})
    return {
        "totalUsers": total_users,
        "activeUsers": active_users,
        "inactiveUsers": inactive_users,
        "totalTasks": total_tasks,
        "pending": pending,
        "inProgress": in_progress,
        "review": review,
        "completed": completed,
        "overdue": overdue,
        "roleDistribution": {"admin": admins, "manager": managers, "employee": employees}
    }

@api_router.get("/dashboard/performance")
async def get_performance(current_user: dict = Depends(require_role("admin", "manager"))):
    # Get all employees with their task stats
    employees = await db.users.find({"role": "employee"}, {"_id": 0, "password": 0}).to_list(1000)
    performance = []
    for emp in employees:
        tasks = await db.tasks.find({"assignedTo": emp["id"]}, {"_id": 0}).to_list(1000)
        total = len(tasks)
        completed = sum(1 for t in tasks if t["status"] == "completed")
        performance.append({
            "id": emp["id"],
            "name": emp["name"],
            "email": emp["email"],
            "isActive": emp.get("isActive", True),
            "totalTasks": total,
            "completedTasks": completed,
            "completionRate": round((completed / total * 100) if total > 0 else 0, 1)
        })
    return performance

# ─── Seed Data ───

@api_router.post("/seed")
async def seed_data():
    # Check if already seeded
    existing = await db.users.find_one({"email": "admin@office.com"}, {"_id": 0})
    if existing:
        return {"message": "Data already seeded"}
    
    # Create users
    admin_id = str(uuid.uuid4())
    manager_id = str(uuid.uuid4())
    emp1_id = str(uuid.uuid4())
    emp2_id = str(uuid.uuid4())
    emp3_id = str(uuid.uuid4())
    
    users = [
        {"id": admin_id, "email": "admin@office.com", "password": hash_password("admin123"), "name": "Alex Admin", "role": "admin", "isActive": True, "createdAt": datetime.now(timezone.utc).isoformat(), "updatedAt": datetime.now(timezone.utc).isoformat()},
        {"id": manager_id, "email": "manager@office.com", "password": hash_password("manager123"), "name": "Morgan Manager", "role": "manager", "isActive": True, "createdAt": datetime.now(timezone.utc).isoformat(), "updatedAt": datetime.now(timezone.utc).isoformat()},
        {"id": emp1_id, "email": "john@office.com", "password": hash_password("employee123"), "name": "John Developer", "role": "employee", "isActive": True, "createdAt": datetime.now(timezone.utc).isoformat(), "updatedAt": datetime.now(timezone.utc).isoformat()},
        {"id": emp2_id, "email": "sarah@office.com", "password": hash_password("employee123"), "name": "Sarah Designer", "role": "employee", "isActive": True, "createdAt": datetime.now(timezone.utc).isoformat(), "updatedAt": datetime.now(timezone.utc).isoformat()},
        {"id": emp3_id, "email": "mike@office.com", "password": hash_password("employee123"), "name": "Mike Tester", "role": "employee", "isActive": False, "createdAt": datetime.now(timezone.utc).isoformat(), "updatedAt": datetime.now(timezone.utc).isoformat()},
    ]
    await db.users.insert_many(users)
    
    # Create tasks
    now = datetime.now(timezone.utc)
    tasks = [
        {"id": str(uuid.uuid4()), "title": "Design landing page", "description": "Create mockups for the new landing page", "status": "in_progress", "priority": "high", "deadline": (now + timedelta(days=3)).isoformat(), "assignedTo": emp2_id, "createdBy": manager_id, "createdByName": "Morgan Manager", "createdAt": now.isoformat(), "updatedAt": now.isoformat()},
        {"id": str(uuid.uuid4()), "title": "Fix authentication bug", "description": "Users unable to reset passwords", "status": "pending", "priority": "critical", "deadline": (now + timedelta(days=1)).isoformat(), "assignedTo": emp1_id, "createdBy": manager_id, "createdByName": "Morgan Manager", "createdAt": now.isoformat(), "updatedAt": now.isoformat()},
        {"id": str(uuid.uuid4()), "title": "Write unit tests", "description": "Cover payment module with tests", "status": "review", "priority": "medium", "deadline": (now + timedelta(days=5)).isoformat(), "assignedTo": emp1_id, "createdBy": manager_id, "createdByName": "Morgan Manager", "createdAt": now.isoformat(), "updatedAt": now.isoformat()},
        {"id": str(uuid.uuid4()), "title": "Update API documentation", "description": "Document all new endpoints", "status": "pending", "priority": "low", "deadline": (now + timedelta(days=7)).isoformat(), "assignedTo": emp1_id, "createdBy": admin_id, "createdByName": "Alex Admin", "createdAt": now.isoformat(), "updatedAt": now.isoformat()},
        {"id": str(uuid.uuid4()), "title": "Design email templates", "description": "Create responsive email templates", "status": "completed", "priority": "medium", "deadline": (now - timedelta(days=2)).isoformat(), "assignedTo": emp2_id, "createdBy": manager_id, "createdByName": "Morgan Manager", "createdAt": (now - timedelta(days=5)).isoformat(), "updatedAt": now.isoformat()},
        {"id": str(uuid.uuid4()), "title": "Performance optimization", "description": "Optimize database queries", "status": "pending", "priority": "high", "deadline": (now + timedelta(days=4)).isoformat(), "assignedTo": emp1_id, "createdBy": admin_id, "createdByName": "Alex Admin", "createdAt": now.isoformat(), "updatedAt": now.isoformat()},
    ]
    await db.tasks.insert_many(tasks)
    
    return {"message": "Seed data created", "credentials": {
        "admin": {"email": "admin@office.com", "password": "admin123"},
        "manager": {"email": "manager@office.com", "password": "manager123"},
        "employee": {"email": "john@office.com", "password": "employee123"}
    }}

# ─── Health Check ───

@api_router.get("/health")
async def health():
    return {"status": "ok"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
