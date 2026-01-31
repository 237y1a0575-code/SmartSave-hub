// FRIENDLY CORPORATE FINTECH SCRIPT

// THEME SYSTEM (Optional)
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
}

// TOAST SYSTEM
function showToast(message) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerText = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px) scale(0.9)';
    toast.style.transition = 'all 0.4s ease';
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

// PROGRESS BAR ANIMATION
function animateProgressBars() {
  setTimeout(() => {
    document.querySelectorAll('.progress-fill').forEach(bar => {
      const targetWidth = bar.getAttribute('data-width');
      bar.style.width = targetWidth + '%';
    });
  }, 100);
}

// MODAL MANAGEMENT
let currentUpiGoalIndex = null;
let currentUpiAmount = null;

// Confirmation State
let currentConfirmIndex = null;
let currentConfirmAmount = null;

function openModal() {
  const modal = document.getElementById("modal");
  if (modal) modal.style.display = "flex";
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
}

// Custom Amount Confirmation
function openConfirmModal(index, amount) {
  currentConfirmIndex = index;
  currentConfirmAmount = amount;

  const display = document.getElementById('confirmAmountDisplay');
  if (display) display.innerText = `₹${amount}`;

  const modal = document.getElementById('confirmModal');
  if (modal) modal.style.display = 'flex';
}

function closeConfirmModal() {
  const modal = document.getElementById('confirmModal');
  if (modal) modal.style.display = 'none';
}

// Bind Final Confirm Button
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('finalConfirmBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      if (currentConfirmIndex !== null && currentConfirmAmount !== null) {
        addMoneyApi(currentConfirmIndex, currentConfirmAmount);
        closeConfirmModal();

        // Clear input if exists
        const input = document.getElementById(`custom-amount-${currentConfirmIndex}`);
        if (input) input.value = '';
      }
    });
  }
});

// QR CODE GENERATOR (Real UPI Format)
function generateRealUPIQR(amount) {
  const canvas = document.getElementById('qrCodeCanvas');
  if (!canvas) return;

  const upiUri = `upi://pay?pa=loki1@okaxis&pn=SmartSaveHub&am=${amount}&cu=INR`;

  // Use QRious to render
  // Default to simulation if lib not loaded (though we added it)
  if (typeof QRious !== 'undefined') {
    new QRious({
      element: canvas,
      value: upiUri,
      size: 200,
      level: 'H'
    });
  } else {
    console.warn("QRious lib not found, skipping QR render");
  }
}

function openUpiModal(index, amount) {
  currentUpiGoalIndex = index;
  currentUpiAmount = amount;
  const amountElem = document.getElementById("upiAmount");
  if (amountElem) amountElem.innerText = `₹${amount}`;

  const modal = document.getElementById("upiModal");
  if (modal) {
    modal.style.display = "flex";
    // Generate QR immediately
    setTimeout(() => generateRealUPIQR(amount), 50);
  }
}

function closeUpiModal() {
  const modal = document.getElementById("upiModal");
  if (modal) modal.style.display = "none";
}

function confirmUpiPayment() {
  if (currentUpiGoalIndex !== null && currentUpiAmount !== null) {
    addMoneyApi(currentUpiGoalIndex, currentUpiAmount);
    closeUpiModal();
  }
}

// TRANSACTION HISTORY
function toggleHistory(index) {
  const content = document.getElementById(`history-${index}`);
  if (content) {
    content.classList.toggle('open');
    // Toggle text
    const toggleBtn = document.querySelector(`#goal-${index} .history-toggle`);
    if (toggleBtn) {
      toggleBtn.innerText = content.classList.contains('open') ? 'Hide Transactions' : 'View Transactions';
    }
  }
}

// GLOBAL HELPERS FOR HTML ONCLICK
function addMoney(index, amount) {
  addMoneyApi(index, amount);
}

function addCustomMoney(index) {
  const input = document.getElementById(`custom-amount-${index}`);
  if (!input) return;

  const amount = parseInt(input.value);
  if (amount && amount > 0) {
    // Open Confirmation Dialog instead of direct add
    openConfirmModal(index, amount);
  } else {
    showToast("Please enter a valid amount greater than 0.");
  }
}

function payUPI(index, amount) {
  openUpiModal(index, 10);
}

// API HANDLERS
function addMoneyApi(index, amount) {
  fetch(`/add-money/${index}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: parseInt(amount) })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        // Real-time Update
        updateGoalCard(index, data);

        // Show Feedback
        showToast(`Saved ₹${amount}! ${data.nudge}`);

        // If completed, reload to show big celebration/change state
        if (data.is_completed) {
          setTimeout(() => {
            localStorage.setItem('just_completed', data.name);
            location.reload();
          }, 1000);
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }
      }
    });
}

function updateGoalCard(index, data) {
  const card = document.getElementById(`goal-${index}`);
  if (!card) return;

  // Update Progress Bar
  const fill = card.querySelector('.progress-fill');
  if (fill) fill.style.width = `${data.percent}%`;

  // Update Saved Text
  const savedLabel = card.querySelector('.progress-labels span:first-child');
  if (savedLabel) savedLabel.innerText = `₹${data.saved}`;

  // Update Nudge
  const nudge = card.querySelector('.nudge-text');
  if (nudge) nudge.innerText = data.nudge;

  // Update History (Prepend new item)
  const historyList = card.querySelector('.history-list');
  if (historyList && data.history_item) {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
       <span>${data.history_item.date}</span>
       <span class="history-amount">+₹${data.history_item.amount}</span>
    `;
    historyList.insertBefore(item, historyList.firstChild);

    // Limit to 3 items visually if needed, or let it grow
    if (historyList.children.length > 3) {
      historyList.lastChild.remove();
    }
  }
}

function deleteGoal(index) {
  if (!confirm("Are you sure you want to delete this goal?")) return;
  fetch(`/delete-goal/${index}`, { method: "POST" })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        localStorage.setItem('pendingToast', "Goal removed. Let's start a new journey! 🗑️");
        location.reload();
      }
    });
}

// LOGIN UTILS
function sendOTP() {
  const val = document.getElementById("loginValue").value;
  if (!val) return showToast("Please enter your email or phone.");
  showToast("We've sent a code to " + val + ". 📱");
}

function verifyOTP() {
  const otp = document.getElementById("otp").value;
  if (otp === "123456") {
    window.location.href = "/goal";
  } else {
    showToast("Hmm, that code doesn't look right. Try 123456.");
  }
}

function googleLogin() {
  window.location.href = "/login/google";
}

// INITIALIZATION
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  animateProgressBars();
});
