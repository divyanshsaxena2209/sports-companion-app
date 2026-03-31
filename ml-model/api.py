from fastapi import FastAPI, UploadFile, File, Form
from pydantic import BaseModel
import numpy as np
from tensorflow import keras
import joblib
import cv2
import base64
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load trained model once
try:
    model = keras.models.load_model("match_predictor_model.h5", compile=False)
except OSError:
    model = None

try:
    scaler = joblib.load("scaler.save")
except FileNotFoundError:
    scaler = None

# MediaPipe Initialization - Bypassing generic __init__.py on newer Pythons
try:
    from mediapipe.python.solutions import pose as mp_pose
except ImportError:
    import mediapipe as mp
    mp_pose = mp.solutions.pose
    
pose = mp_pose.Pose(static_image_mode=True, min_detection_confidence=0.5)


class Player(BaseModel):
    height: float
    weight: float
    age: float
    experience: float

class MatchRequest(BaseModel):
    player1: Player
    player2: Player
    useDeepModel: bool = False  # decides quick vs deep

@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "sports-ml-predictor",
        "predict_endpoint": "/predict",
        "height_endpoint": "/estimate-height"
    }

def calculate_total_adv(p1, p2):
    height_adv = (p1.height - p2.height) * 0.2
    weight_adv = (p1.weight - p2.weight) * 0.1
    exp_adv = (p1.experience - p2.experience) * 3.0
    age_adv = (p2.age - p1.age) * 0.5
    return height_adv + weight_adv + exp_adv + age_adv

@app.post("/predict")
def predict_match(data: MatchRequest):
    p1 = data.player1
    p2 = data.player2
    
    if not model or not data.useDeepModel:
        total_adv = calculate_total_adv(p1, p2)
        clamped_adv = max(-45.0, min(45.0, total_adv))
        p1_prob = 50.0 + clamped_adv
        dominant = "Player 1" if p1_prob >= 50 else "Player 2"
        final_prob = p1_prob if p1_prob >= 50 else (100.0 - p1_prob)
        fairness = "Fair Match" if abs(clamped_adv) < 15 else "Unbalanced Match"

        return {
            "fairness": fairness,
            "dominance": {
                "player": dominant,
                "probability": round(float(final_prob), 2)
            },
            "mode": "quick-heuristic"
        }

    X = np.array([[
        p1.height, p1.weight, p1.age, p1.experience,
        p2.height, p2.weight, p2.age, p2.experience
    ]], dtype=np.float32)

    if scaler:
        X = scaler.transform(X)

    preds = model.predict(X, verbose=0)
    prob_p1 = float(preds[0][0])
    
    if prob_p1 >= 0.5:
        dominant = "Player 1"
        final_prob = prob_p1 * 100
    else:
        dominant = "Player 2"
        final_prob = (1.0 - prob_p1) * 100

    return {
        "fairness": "Fair Match" if final_prob < 60 else "Unbalanced Match",
        "dominance": {
            "player": dominant,
            "probability": round(final_prob, 2)
        },
        "mode": "hybrid-ai"
    }

@app.post("/estimate-height")
async def estimate_height(image_data: str = Form(...)):
    try:
        header, encoded = image_data.split(",", 1) if "," in image_data else ("", image_data)
        img_bytes = base64.b64decode(encoded)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if image is None:
            return {"error": "Invalid image format", "status": "failed"}

        # 1. Detect A4 paper (white rectangle) using OpenCV
        a4_pixel_height = None
        
        # Convert to HSV to isolate bright/white areas
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        lower_white = np.array([0, 0, 150], dtype=np.uint8)
        upper_white = np.array([180, 50, 255], dtype=np.uint8)
        mask = cv2.inRange(hsv, lower_white, upper_white)
        
        blurred = cv2.GaussianBlur(mask, (5, 5), 0)
        edged = cv2.Canny(blurred, 50, 150)
        contours, _ = cv2.findContours(edged, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        contours = sorted(contours, key=cv2.contourArea, reverse=True)
        for c in contours[:10]:
            peri = cv2.arcLength(c, True)
            approx = cv2.approxPolyDP(c, 0.02 * peri, True)
            if len(approx) == 4:
                x, y, w, h = cv2.boundingRect(approx)
                aspect = max(w, h) / float(min(w, h))
                if 1.2 < aspect < 1.6 and cv2.contourArea(c) > 3000:
                    a4_pixel_height = max(w, h)
                    break

        # 2. Detect Person using MediaPipe Pose
        person_pixel_height = None
        img_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = pose.process(img_rgb)
        
        if results.pose_landmarks:
            h_img, w_img, _ = image.shape
            landmarks = results.pose_landmarks.landmark
            nose = landmarks[0]
            left_ankle = landmarks[27]
            right_ankle = landmarks[28]
            
            nose_y = nose.y * h_img
            ankle_y = max(left_ankle.y * h_img, right_ankle.y * h_img)
            person_pixel_height = ankle_y - nose_y

        if a4_pixel_height and person_pixel_height:
            height_cm = (person_pixel_height / a4_pixel_height) * 29.7
            return {"height_cm": round(height_cm, 1), "status": "success"}
        else:
            error_msg = []
            if not person_pixel_height: error_msg.append("Person pose (head and feet) not fully visible.")
            if not a4_pixel_height: error_msg.append("A4 paper not found securely. Ensure it is clearly visible and well-lit.")
            return {"error": " ".join(error_msg), "status": "failed"}
            
    except Exception as e:
        return {"error": str(e), "status": "failed"}

