"""
MongoDB Database Connection and Storage Manager for CIT Campus Scheduling Platform.
Connects via Motor to MongoDB Atlas or local MongoDB.
Includes an in-memory replica-set simulation when MongoDB is not running locally.
"""

import os
import asyncio
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

logger = logging.getLogger("cit_db")

# In-memory mock storage for standalone dev/test mode
class MockCollection:
    def __init__(self, name: str):
        self.name = name
        self.docs: List[Dict[str, Any]] = []
        self.unique_keys: List[tuple] = []

    def create_index(self, keys, unique=False):
        if unique:
            self.unique_keys.append(tuple(k[0] for k in keys))

    async def find_one(self, filter_dict: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        for d in self.docs:
            match = True
            for k, v in filter_dict.items():
                if d.get(k) != v:
                    match = False
                    break
            if match:
                return dict(d)
        return None

    def find(self, filter_dict: Optional[Dict[str, Any]] = None):
        filter_dict = filter_dict or {}
        results = []
        for d in self.docs:
            match = True
            for k, v in filter_dict.items():
                if d.get(k) != v:
                    match = False
                    break
            if match:
                results.append(dict(d))
        
        class Cursor:
            def __init__(self, data):
                self.data = data
            def __aiter__(self):
                self.iter = iter(self.data)
                return self
            async def __anext__(self):
                try:
                    return next(self.iter)
                except StopIteration:
                    raise StopAsyncIteration
            async def to_list(self, length=None):
                return self.data[:length] if length else self.data
        return Cursor(results)

    async def insert_one(self, doc: Dict[str, Any]):
        # Check unique constraint
        for u_fields in self.unique_keys:
            key_val = tuple(doc.get(f) for f in u_fields)
            for existing in self.docs:
                ex_val = tuple(existing.get(f) for f in u_fields)
                if key_val == ex_val and all(v is not None for v in key_val):
                    raise Exception(f"DuplicateKeyError on index {u_fields}")
        d = dict(doc)
        if "_id" not in d:
            d["_id"] = f"{self.name}_{len(self.docs)+1}_{datetime.now().timestamp()}"
        self.docs.append(d)
        class InsertRes:
            inserted_id = d["_id"]
        return InsertRes()

    async def update_one(self, filter_dict: Dict[str, Any], update_dict: Dict[str, Any], upsert=False):
        doc = await self.find_one(filter_dict)
        if doc:
            for d in self.docs:
                if d["_id"] == doc["_id"]:
                    if "$set" in update_dict:
                        d.update(update_dict["$set"])
                    if "$inc" in update_dict:
                        for ik, iv in update_dict["$inc"].items():
                            d[ik] = d.get(ik, 0) + iv
                    return
        elif upsert:
            new_doc = dict(filter_dict)
            if "$set" in update_dict:
                new_doc.update(update_dict["$set"])
            await self.insert_one(new_doc)

    async def find_one_and_update(self, filter_dict: Dict[str, Any], update_dict: Dict[str, Any]):
        doc = await self.find_one(filter_dict)
        if doc:
            await self.update_one(filter_dict, update_dict)
            return await self.find_one({"_id": doc["_id"]})
        return None

    async def delete_many(self, filter_dict: Dict[str, Any]):
        new_docs = []
        for d in self.docs:
            match = True
            for k, v in filter_dict.items():
                if d.get(k) != v:
                    match = False
                    break
            if not match:
                new_docs.append(d)
        self.docs = new_docs

    async def count_documents(self, filter_dict: Dict[str, Any]) -> int:
        c = 0
        for d in self.docs:
            match = True
            for k, v in filter_dict.items():
                if d.get(k) != v:
                    match = False
                    break
            if match:
                c += 1
        return c

class DatabaseManager:
    def __init__(self):
        self.uri = os.getenv("MONGODB_URI", "")
        self.db_name = os.getenv("MONGODB_DB", "cit")
        self.is_connected = False
        self.client = None
        self.db = None
        self._mock_collections: Dict[str, MockCollection] = {}

    async def connect(self):
        if self.uri and self.uri.startswith("mongodb"):
            try:
                import motor.motor_asyncio
                self.client = motor.motor_asyncio.AsyncIOMotorClient(
                    self.uri,
                    serverSelectionTimeoutMS=2000
                )
                self.db = self.client[self.db_name]
                # Test ping
                await self.db.command("ping")
                self.is_connected = True
                logger.info("Connected to MongoDB Atlas / Server successfully.")
                return
            except Exception as e:
                logger.warning(f"MongoDB connection failed: {e}. Falling back to in-memory store.")

        self.is_connected = False
        logger.info("Using in-memory replica store (standalone mode).")

    def get_collection(self, name: str):
        if self.is_connected and self.db is not None:
            return self.db[name]
        if name not in self._mock_collections:
            self._mock_collections[name] = MockCollection(name)
        return self._mock_collections[name]

    async def create_indexes(self):
        """Idempotent index creation."""
        # 1. occupancy: unique {room_id, day, period}
        occ = self.get_collection("occupancy")
        if self.is_connected:
            await occ.create_index([("room_id", 1), ("day", 1), ("period", 1)], unique=True)
            # 2. room_slots: unique {room_id, date, period}
            slots = self.get_collection("room_slots")
            await slots.create_index([("room_id", 1), ("date", 1), ("period", 1)], unique=True)
            # 3. users: unique {email}
            users = self.get_collection("users")
            await users.create_index([("email", 1)], unique=True)
        else:
            occ.create_index([("room_id", 1), ("day", 1), ("period", 1)], unique=True)
            self.get_collection("room_slots").create_index([("room_id", 1), ("date", 1), ("period", 1)], unique=True)
            self.get_collection("users").create_index([("email", 1)], unique=True)

db_manager = DatabaseManager()

