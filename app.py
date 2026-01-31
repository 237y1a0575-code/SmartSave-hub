import os
import json
import shutil
from flask import Flask, render_template, request, redirect, url_for, jsonify, session
from datetime import datetime, timedelta
from authlib.integrations.flask_client import OAuth

app = Flask(__name__)
app.secret_key = "anybloboftext" 

# GOOGLE OAUTH CONFIGURATION
GOOGLE_CLIENT_ID = "YOUR_CLIENT_ID_HERE"
GOOGLE_CLIENT_SECRET = "YOUR_CLIENT_SECRET_HERE"

oauth = OAuth(app)
google = oauth.register(
    name='google',
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    access_token_url='https://accounts.google.com/o/oauth2/token',
    authorize_url='https://accounts.google.com/o/oauth2/auth',
    api_base_url='https://www.googleapis.com/oauth2/v1/',
    client_kwargs={'scope': 'openid email profile'},
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration'
)

# Vercel Data Persistence
# Vercel filesystem is read-only except for /tmp
# We must use /tmp to save data in production (Linux)
# But on Windows (Local), /tmp doesn't exist
import platform

if platform.system() == "Windows":
    DATA_FILE = "goals.json" # Local file for Windows dev
else:
    DATA_FILE = os.path.join("/tmp", "goals.json") # Vercel/Linux

INITIAL_FILE = "goals.json"

def load_goals():
    # If /tmp/goals.json doesn't exist, try to copy from local goals.json or start empty
    if not os.path.exists(DATA_FILE):
        if os.path.exists(INITIAL_FILE):
            try:
                shutil.copy(INITIAL_FILE, DATA_FILE)
            except Exception as e:
                print(f"Error copying initial file: {e}")
                return []
        else:
            return []
            
    try:
        with open(DATA_FILE, "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading goals: {e}")
        return []

def save_goals(goals):
    try:
        with open(DATA_FILE, "w") as f:
            json.dump(goals, f, indent=4)
    except Exception as e:
        print(f"Error saving goals: {e}")

# --- ANALYTICS HELPER FUNCTIONS ---

def parse_date(date_str):
    try:
        return datetime.strptime(f"{date_str} {datetime.now().year}", "%d %b %Y").date()
    except:
        return None

def calculate_global_streak(goals):
    all_dates = set()
    for goal in goals:
        for txn in goal.get("history", []):
            d = parse_date(txn["date"])
            if d:
                all_dates.add(d)
    
    if not all_dates: return 0
    
    sorted_dates = sorted(list(all_dates), reverse=True)
    today = datetime.now().date()
    yesterday = today - timedelta(days=1)
    
    current_streak = 0
    if sorted_dates[0] < yesterday: return 0
        
    check_date = today if sorted_dates[0] == today else yesterday
        
    for d in sorted_dates:
        if d == check_date:
            current_streak += 1
            check_date -= timedelta(days=1)
        elif d > check_date: continue
        else: break
            
    return current_streak

def get_smart_nudge(saved, target):
    if target == 0: return "Start saving!"
    percent = (saved / target) * 100
    
    if percent >= 100: return "🏆 Goal Reached! A meaningful step forward!"
    if percent >= 90: return "Final stretch! You are unstoppable! 🚀"
    if percent >= 75: return "Incredible! 3/4 done. Finish strong! 💎"
    if percent >= 50: return "Halfway mark passed! You're crushing it! 🔥"
    if percent >= 25: return "25% secured! The habit is building. 🏗️"
    if percent >= 10: return "Double digits! Nice momentum. 🌊"
    if percent > 0: return "Every rupee counts! Small steps matter. 🌱"
    return "The best time to start is now! 🌟"

def calculate_projection(goal):
    if goal['saved'] >= goal['target']: return "Goal Reached!"
    amount_left = goal['target'] - goal['saved']
    history = goal.get('history', [])
    if not history: return "Start saving to get an estimate"
        
    first_txn = history[-1]
    d1 = parse_date(first_txn['date'])
    if not d1: return "Insufficient data"
        
    total_days = max(1, (datetime.now().date() - d1).days)
    daily_avg = goal['saved'] / total_days
    
    if daily_avg <= 0: return "Save more to see projection"
    days_needed = int(amount_left / daily_avg)
    
    if days_needed < 30: return f"~{days_needed} days to go"
    else: return f"~{round(days_needed / 30, 1)} months to go"

def get_user_badges(goals, streak):
    badges = []
    total_saved = sum(g['saved'] for g in goals)
    if total_saved > 0: badges.append({"icon": "🌱", "name": "First Step", "desc": "Started journey"})
    if streak >= 7: badges.append({"icon": "🔥", "name": "Streak Master", "desc": "7+ day streak"})
    if any(g['saved'] >= g['target'] for g in goals): badges.append({"icon": "🏆", "name": "Goal Crusher", "desc": "Goal completed"})
    if total_saved >= 10000: badges.append({"icon": "💎", "name": "Super Saver", "desc": "Saved ₹10k+"})
    return badges

# --- ROUTES ---

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/login")
def login_page():
    return render_template("login.html")

@app.route("/login/google")
def login_google():
    if GOOGLE_CLIENT_ID != "YOUR_CLIENT_ID_HERE":
        redirect_uri = url_for('authorize', _external=True)
        return google.authorize_redirect(redirect_uri)
    return render_template("sim_google.html")

@app.route("/sim-authorize", methods=["POST"])
def sim_authorize():
    session['user'] = {
        'name': 'Lokesh King',
        'email': 'lokeshking616@gmail.com',
        'picture': 'https://img.icons8.com/color/96/000000/user.png'
    }
    return redirect("/goal")

@app.route("/authorize")
def authorize():
    token = google.authorize_access_token()
    session['user'] = google.get('userinfo').json()
    return redirect("/goal")

@app.route("/logout")
def logout():
    session.pop('user', None)
    return redirect("/")

@app.route("/goal")
def goal_page():
    user = session.get('user')
    # ALWAYS load fresh goals
    goals = load_goals()
    
    streak = calculate_global_streak(goals)
    badges = get_user_badges(goals, streak)
    
    for goal in goals:
        goal['percent'] = min(100, int((goal['saved'] / goal['target']) * 100)) if goal['target'] > 0 else 0
        goal['nudge'] = get_smart_nudge(goal['saved'], goal['target'])
        goal['projection'] = calculate_projection(goal)
        
    return render_template("goal.html", goals=goals, user=user, streak=streak, badges=badges)

@app.route("/add-goal", methods=["POST"])
def add_goal():
    goals = load_goals()
    name = request.form.get("name")
    target = request.form.get("target")
    deadline = request.form.get("deadline")
    icon = request.form.get("icon")

    if name and target:
        goals.append({
            "name": name,
            "target": int(target),
            "saved": 0,
            "deadline": deadline if deadline else "No Deadline",
            "icon": icon,
            "history": [],
            "last_transaction": None
        })
        save_goals(goals)
    return redirect("/goal")

@app.route("/delete-goal/<int:index>", methods=["POST"])
def delete_goal(index):
    goals = load_goals()
    if index < 0 or index >= len(goals):
        return jsonify(success=False, error="Invalid index"), 400
    
    goals.pop(index)
    save_goals(goals)
    return jsonify(success=True)

@app.route("/add-money/<int:index>", methods=["POST"])
def add_money(index):
    goals = load_goals()
    if index < 0 or index >= len(goals):
        return jsonify(success=False, error="Invalid index"), 400
    
    amount = int(request.json.get("amount", 0))
    if amount <= 0: return jsonify(success=False, error="Invalid amount"), 400
    
    now = datetime.now()
    transaction = {
        "amount": amount,
        "date": now.strftime("%d %b"),
        "time": now.strftime("%H:%M")
    }
    
    if "history" not in goals[index]: goals[index]["history"] = []
    
    goals[index]["saved"] += amount
    goals[index]["history"].insert(0, transaction)
    save_goals(goals)
    
    # Compute stats for response
    goal = goals[index]
    percent = min(100, int((goal["saved"] / goal["target"]) * 100)) if goal["target"] > 0 else 0
    nudge = get_smart_nudge(goal["saved"], goal["target"])
    streak = calculate_global_streak(goals)
    
    return jsonify(
        success=True, 
        saved=goal["saved"], 
        percent=percent,
        nudge=nudge,
        streak=streak,
        history_item=transaction,
        is_completed=(goal["saved"] >= goal["target"]),
        name=goal["name"]
    )

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host="0.0.0.0", port=port)
