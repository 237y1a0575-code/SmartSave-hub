import os
import json
from flask import Flask, render_template, request, redirect, url_for, jsonify, session
from datetime import datetime
from authlib.integrations.flask_client import OAuth

app = Flask(__name__)
app.secret_key = "anybloboftext" # Required for sessions

# GOOGLE OAUTH CONFIGURATION (Real Gmail Login)
# 1. Go to: https://console.cloud.google.com/
# 2. Create a project -> APIs & Services -> Credentials
# 3. Create OAuth 2.0 Client ID (Web Application)
# 4. Authorized Redirect URI: http://127.0.0.1:5000/authorize
GOOGLE_CLIENT_ID = "YOUR_CLIENT_ID_HERE"
GOOGLE_CLIENT_SECRET = "YOUR_CLIENT_SECRET_HERE"

# Logic starts below

oauth = OAuth(app)
google = oauth.register(
    name='google',
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    access_token_url='https://accounts.google.com/o/oauth2/token',
    access_token_params=None,
    authorize_url='https://accounts.google.com/o/oauth2/auth',
    authorize_params=None,
    api_base_url='https://www.googleapis.com/oauth2/v1/',
    client_kwargs={'scope': 'openid email profile'},
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration'
)

import shutil

# Vercel filesystem is read-only except for /tmp
# We must use /tmp to save data
DATA_FILE = os.path.join("/tmp", "goals.json")
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

# Load initial goals
goals = load_goals()

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/login")
def login_page():
    return render_template("login.html")

@app.route("/login/google")
def login_google():
    # Only use real Google if keys are provided
    if GOOGLE_CLIENT_ID != "YOUR_CLIENT_ID_HERE":
        redirect_uri = url_for('authorize', _external=True)
        return google.authorize_redirect(redirect_uri)
    else:
        # Fallback to a professional simulated Google Login for the Project Demo
        return render_template("sim_google.html")

@app.route("/sim-authorize", methods=["POST"])
def sim_authorize():
    # Simulate the user data normally returned by Google
    session['user'] = {
        'name': 'Lokesh King',
        'email': 'lokeshking616@gmail.com',
        'picture': 'https://img.icons8.com/color/96/000000/user.png'
    }
    return redirect("/goal")

@app.route("/authorize")
def authorize():
    if GOOGLE_CLIENT_ID == "YOUR_CLIENT_ID_HERE":
        return redirect("/login/google")
    token = google.authorize_access_token()
    info = google.get('userinfo').json()
    session['user'] = info
    return redirect("/goal")

@app.route("/logout")
def logout():
    session.pop('user', None)
    return redirect("/")

NUDGES = [
    "You're doing great! Small steps lead to big wins. 🚀",
    "Nearly halfway there! Keep the momentum going. 💎",
    "Your future self will thank you for this savings! 🌟",
    "Did you know? Saving daily builds a massive habit. 📈",
    "Goal in sight! Just a few more contributions. 🎯"
]

from datetime import datetime, timedelta

# ... (Imports and setup remain) ...

# --- HELPER FUNCTIONS ---

def parse_date(date_str):
    """Parses '30 Jan' to a date object (assuming current year)."""
    try:
        return datetime.strptime(f"{date_str} {datetime.now().year}", "%d %b %Y").date()
    except:
        return None

def calculate_global_streak(goals):
    """Calculates the consecutive daily savings streak across all goals."""
    all_dates = set()
    for goal in goals:
        for txn in goal.get("history", []):
            d = parse_date(txn["date"])
            if d:
                all_dates.add(d)
    
    if not all_dates:
        return 0
    
    sorted_dates = sorted(list(all_dates), reverse=True)
    today = datetime.now().date()
    yesterday = today - timedelta(days=1)
    
    # If no save today or yesterday, streak is broken (0)
    # Exception: if user hasn't saved today BUT saved yesterday, streak is alive but count depends on yesterday.
    
    current_streak = 0
    
    # Check if the most recent date is today or yesterday
    if sorted_dates[0] < yesterday:
        return 0
        
    # Start checking from today (or yesterday if today is missing)
    check_date = today
    if sorted_dates[0] == yesterday:
        check_date = yesterday
        
    for d in sorted_dates:
        if d == check_date:
            current_streak += 1
            check_date -= timedelta(days=1)
        elif d > check_date:
            continue # Duplicate or future date?
        else:
            break # Gap found
            
    return current_streak

def calculate_monthly_analytics(goals):
    """Groups savings by month."""
    analytics = {}
    for goal in goals:
        for txn in goal.get("history", []):
            d = parse_date(txn["date"])
            if d:
                month_key = d.strftime("%b") # e.g., "Jan"
                analytics[month_key] = analytics.get(month_key, 0) + txn["amount"]
    return analytics

def get_smart_nudge(saved, target):
    if target == 0: return "Start saving!"
    percent = (saved / target) * 100
    
    if percent >= 100: return "🏆 Goal Reached! meaningful step forward!"
    if percent >= 90: return "Final stretch! You are unstoppable! 🚀"
    if percent >= 75: return "Incredible! 3/4 done. Finish strong! 💎"
    if percent >= 50: return "Halfway mark passed! You're crushing it! 🔥"
    if percent >= 25: return "25% secured! The habit is building. 🏗️"
    if percent >= 10: return "Double digits! Nice momentum. 🌊"
    if percent > 0: return "Every rupee counts! Small steps matter. 🌱"
    return "The best time to start is now! 🌟"

# --- ROUTES ---

@app.route("/get-upi-link/<int:index>/<int:amount>")
def get_upi_link(index, amount):
    if index < 0 or index >= len(goals):
        return jsonify(success=False), 400
    goal = goals[index]
    # Simulated UPI link
    upi_uri = f"upi://pay?pa=loki1@okaxis&pn=MicroSave&am={amount}&tn=Savings for {goal['name']}"
    return jsonify(success=True, upi_uri=upi_uri)

@app.route("/add-goal", methods=["POST"])
def add_goal():
    name = request.form.get("name")
    target = request.form.get("target")
    deadline = request.form.get("deadline")
    icon = request.form.get("icon") # Optional icon selection

    if not name or not target:
        return redirect("/goal")

    goals.append({
        "name": name,
        "target": int(target),
        "saved": 0,
        "deadline": deadline if deadline else "No Deadline",
        "icon": icon, # Store specific icon if provided
        "history": [],
        "last_transaction": None
    })
    save_goals(goals)
    return redirect("/goal")

import random # For payment failure sim

# ... (Previous imports) ...

# --- HELPER FUNCTIONS ---

def calculate_projection(goal):
    """Predicts time to completion based on average daily savings."""
    if goal['saved'] >= goal['target']:
        return "Goal Reached!"
    
    amount_left = goal['target'] - goal['saved']
    
    # Calculate daily average from history
    history = goal.get('history', [])
    if not history:
        return "Start saving to get an estimate"
        
    first_txn = history[-1] # Oldest
    last_txn = history[0]   # Newest
    
    d1 = parse_date(first_txn['date'])
    d2 = parse_date(last_txn['date'])
    
    if not d1 or not d2:
        return "Insufficient data"
        
    total_days = (datetime.now().date() - d1).days
    # Avoid division by zero, treat same day as 1 day
    total_days = max(1, total_days)
    
    daily_avg = goal['saved'] / total_days
    
    if daily_avg <= 0:
        return "Save more to see projection"
        
    days_needed = int(amount_left / daily_avg)
    
    if days_needed < 30:
        return f"~{days_needed} days to go"
    else:
        months = round(days_needed / 30, 1)
        return f"~{months} months to go"

def get_user_badges(goals, streak):
    badges = []
    
    # 1. First Step Badge
    total_saved = sum(g['saved'] for g in goals)
    if total_saved > 0:
        badges.append({"icon": "🌱", "name": "First Step", "desc": "Started the saving journey"})
        
    # 2. Streak Master
    if streak >= 7:
        badges.append({"icon": "🔥", "name": "Streak Master", "desc": "Saved for 7+ days in a row"})
        
    # 3. Goal Crusher
    completed_goals = sum(1 for g in goals if g['saved'] >= g['target'])
    if completed_goals > 0:
        badges.append({"icon": "🏆", "name": "Goal Crusher", "desc": "Completed at least one goal"})
        
    # 4. Super Saver (Total > 10k)
    if total_saved >= 10000:
        badges.append({"icon": "💎", "name": "Super Saver", "desc": "Saved over ₹10,000"})
        
    return badges

def check_reminder(goals):
    """Check if user hasn't saved for > 2 days."""
    if not goals: return None
    
    last_dates = []
    for g in goals:
        if g.get('history'):
            d = parse_date(g['history'][0]['date'])
            if d: last_dates.append(d)
            
    if not last_dates:
        return "Start your savings streak today! 🚀"
        
    latest = max(last_dates)
    diff = (datetime.now().date() - latest).days
    
    if diff > 2:
        return f"You haven't saved in {diff} days! Put away just ₹10 today. ⏳"
    return None

# --- ROUTES ---

@app.route("/goal")
def goal_page():
    user = session.get('user')
    streak = calculate_global_streak(goals)
    analytics = calculate_monthly_analytics(goals) # Kept logically, but UI removed
    badges = get_user_badges(goals, streak)
    reminder = check_reminder(goals)
    
    # Calculate progress % & Projection for each goal
    for goal in goals:
        goal['percent'] = min(100, int((goal['saved'] / goal['target']) * 100)) if goal['target'] > 0 else 0
        goal['nudge'] = get_smart_nudge(goal['saved'], goal['target'])
        goal['projection'] = calculate_projection(goal)
        
    return render_template("goal.html", goals=goals, user=user, streak=streak, badges=badges, reminder=reminder)

@app.route("/add-money/<int:index>", methods=["POST"])
def add_money(index):
    if index < 0 or index >= len(goals):
        return jsonify(success=False, error="Invalid goal index"), 400
    
    amount = int(request.json.get("amount", 0))
    if amount <= 0:
        return jsonify(success=False, error="Amount must be positive"), 400
    
    now = datetime.now()
    date_str = now.strftime("%d %b")
    time_str = now.strftime("%H:%M")
    
    transaction = {
        "amount": amount,
        "date": date_str,
        "time": time_str
    }
    
    if "history" not in goals[index]:
        goals[index]["history"] = []
    
    goals[index]["saved"] += amount
    goals[index]["history"].insert(0, transaction)
    goals[index]["last_transaction"] = transaction
    
    save_goals(goals)
    
    # Compute Response Data
    saved = goals[index]["saved"]
    target = goals[index]["target"]
    percent = min(100, int((saved / target) * 100)) if target > 0 else 0
    nudge = get_smart_nudge(saved, target)
    streak = calculate_global_streak(goals)
    
    # Re-calc projection for dynamic update? 
    # Frontend handles simple updates, projection might need reload or simple separate call, 
    # but for now we won't update projection dynamically to save complexity, it updates on refresh.
    
    return jsonify(
        success=True, 
        saved=saved, 
        target=target,
        percent=percent,
        nudge=nudge,
        streak=streak,
        history_item=transaction,
        is_completed=(saved >= target)
    )

@app.route("/delete-goal/<int:index>", methods=["POST"])
def delete_goal(index):
    if index < 0 or index >= len(goals):
        return jsonify(success=False, error="Invalid goal index"), 400
    
    goals.pop(index)
    save_goals(goals)
    return jsonify(success=True)

if __name__ == "__main__":
    try:
        import socket
        # Get the local IP address to show the user
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)
        print(f"\n -> 📲 Access this app at: https://smart-save-hub.vercel.app\n")
    except Exception:
        print("\n -> ⚠️  Could not detect local IP. Run 'ipconfig' to find it.\n")

    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host="0.0.0.0", port=port)
