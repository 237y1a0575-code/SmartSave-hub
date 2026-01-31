// SMARTSAVE HUB - COMPLETE SCRIPT
// Fixed version with proper UPI amount and custom amount handling

// ============= THEME SYSTEM =============
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
}

// ============= TOAST SYSTEM =============
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

// ============= PROGRESS BAR ANIMATION =============
function animateProgressBars() {
  setTimeout(() => {
    document.querySelectorAll('.progress-fill').forEach(bar => {
      const targetWidth = bar.getAttribute('data-width');
      if (targetWidth) bar.style.width = targetWidth + '%';
    });
  }, 100);
}

// ============= STATE VARIABLES =============
let currentGoalIndex = null;
let currentAmount = null;

// ============= CREATE GOAL MODAL =============
function openModal() {
  const modal = document.getElementById("modal");
  if (modal) modal.style.display = "flex";
}

function closeModal() {
  const modal = document.getElementById("modal");
  if (modal) modal.style.display = "none";
}

// ============= UPI MODAL FUNCTIONS =============
function openUpiModal(index, amount) {
  currentGoalIndex = index;
  currentAmount = amount;

  // Update amount display
  const amountElem = document.getElementById("upiAmount");
  if (amountElem) amountElem.innerText = `₹${amount}`;

  // Show modal
  const modal = document.getElementById("upiModal");
  if (modal) {
    modal.style.display = "flex";
    // Generate QR code after modal is visible
    setTimeout(() => generateUPIQRCode(amount), 50);
  }
}

function closeUpiModal() {
  const modal = document.getElementById("upiModal");
  if (modal) modal.style.display = "none";
  currentGoalIndex = null;
  currentAmount = null;
}

function generateUPIQRCode(amount) {
  const canvas = document.getElementById('qrCodeCanvas');
  if (!canvas) return;

  const upiUri = `upi://pay?pa=loki1@okaxis&pn=SmartSaveHub&am=${amount}&cu=INR`;

  if (typeof QRious !== 'undefined') {
    new QRious({
      element: canvas,
      value: upiUri,
      size: 200,
      level: 'H'
    });
  }
}

function confirmUpiPayment() {
  if (currentGoalIndex !== null && currentAmount !== null) {
    // Add money to the goal
    addMoneyToGoal(currentGoalIndex, currentAmount);
    closeUpiModal();

    // Clear the custom input field
    const input = document.getElementById(`input-amount-${currentGoalIndex}`);
    if (input) input.value = '';
  }
}

// ============= CONFIRMATION MODAL (for custom amount) =============
function openConfirmModal(index, amount) {
  currentGoalIndex = index;
  currentAmount = amount;

  const display = document.getElementById('confirmAmountDisplay');
  if (display) display.innerText = `₹${amount}`;

  const modal = document.getElementById('confirmModal');
  if (modal) modal.style.display = 'flex';
}

function closeConfirmModal() {
  const modal = document.getElementById('confirmModal');
  if (modal) modal.style.display = 'none';
}

// ============= MAIN ACTION FUNCTIONS =============

// Quick add buttons (+₹10, +₹50)
function addMoney(index, amount) {
  addMoneyToGoal(index, amount);
}

// Pay UPI button (uses selected amount)
function payUPI(index, amount) {
  openUpiModal(index, amount);
}

// Custom UPI payment (reads from input field)
function payCustomUPI(index) {
  const input = document.getElementById(`input-amount-${index}`);
  let amount = 100; // Default if empty

  if (input && input.value) {
    const val = parseInt(input.value);
    if (val > 0) amount = val;
  }

  openUpiModal(index, amount);
}

// Custom amount save button
function addCustomMoney(index) {
  const input = document.getElementById(`input-amount-${index}`);
  if (!input) {
    showToast("Could not find amount input.");
    return;
  }

  const amount = parseInt(input.value);
  if (amount && amount > 0) {
    // Open confirmation modal
    openConfirmModal(index, amount);
  } else {
    showToast("Please enter a valid amount greater than 0.");
  }
}

// ============= API HANDLER =============
function addMoneyToGoal(index, amount) {
  fetch(`/add-money/${index}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: parseInt(amount) })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        // Update the UI
        updateGoalCard(index, data);

        // Show success toast
        showToast(`Saved ₹${amount}! ${data.nudge}`);

        // If goal completed, celebrate!
        if (data.is_completed) {
          if (typeof confetti !== 'undefined') {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          }
          setTimeout(() => {
            localStorage.setItem('just_completed', data.name);
            location.reload();
          }, 1000);
        }
      } else {
        showToast("Failed to add money. Please try again.");
      }
    })
    .catch(err => {
      console.error("Error adding money:", err);
      showToast("Network error. Please try again.");
    });
}

function updateGoalCard(index, data) {
  const card = document.getElementById(`goal-${index}`);
  if (!card) return;

  // Update Progress Bar
  const fill = card.querySelector('.progress-fill');
  if (fill) fill.style.width = `${data.percent}%`;

  // Update Saved Amount Text
  const savedLabel = card.querySelector('.progress-labels span:first-child');
  if (savedLabel) savedLabel.innerText = `₹${data.saved}`;

  // Update Nudge Text
  const nudge = card.querySelector('.nudge-text');
  if (nudge) nudge.innerText = data.nudge;

  // Add new transaction to history
  const historyList = card.querySelector('.history-list');
  if (historyList && data.history_item) {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
       <span>${data.history_item.date}</span>
       <span class="history-amount">+₹${data.history_item.amount}</span>
    `;
    historyList.insertBefore(item, historyList.firstChild);

    // Keep only 3 items visible
    if (historyList.children.length > 3) {
      historyList.lastChild.remove();
    }
  }
}

// ============= DELETE GOAL =============
function deleteGoal(index) {
  if (!confirm("Are you sure you want to delete this goal?")) return;

  fetch(`/delete-goal/${index}`, { method: "POST" })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        localStorage.setItem('pendingToast', "Goal removed successfully! 🗑️");
        location.reload();
      }
    });
}

// ============= TRANSACTION HISTORY TOGGLE =============
function toggleHistory(index) {
  const content = document.getElementById(`history-${index}`);
  if (content) {
    content.classList.toggle('open');
    const toggleBtn = document.querySelector(`#goal-${index} .history-toggle`);
    if (toggleBtn) {
      toggleBtn.innerText = content.classList.contains('open') ? 'Hide Transactions' : 'View Transactions';
    }
  }
}

// ============= LOGIN FUNCTIONS =============
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

// ============= INITIALIZATION =============
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  animateProgressBars();

  // Setup confirm button listener
  const confirmBtn = document.getElementById('finalConfirmBtn');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      if (currentGoalIndex !== null && currentAmount !== null) {
        addMoneyToGoal(currentGoalIndex, currentAmount);
        closeConfirmModal();

        // Clear the input field
        const input = document.getElementById(`input-amount-${currentGoalIndex}`);
        if (input) input.value = '';
      }
    });
  }

  // Show pending toast if exists
  const pendingToast = localStorage.getItem('pendingToast');
  if (pendingToast) {
    showToast(pendingToast);
    localStorage.removeItem('pendingToast');
  }
});
