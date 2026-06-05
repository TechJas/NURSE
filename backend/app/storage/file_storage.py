import os, uuid
from fastapi import UploadFile

BASE_DIR = "uploads/nurses"

def save_file(file: UploadFile, nurse_id: str) -> str:
    nurse_dir = os.path.join(BASE_DIR, nurse_id)
    os.makedirs(nurse_dir, exist_ok=True)

    safe_name = f"{uuid.uuid4()}.bin"
    path = os.path.join(nurse_dir, safe_name)

    with open(path, "wb") as f:
        f.write(file.file.read())

    return path
