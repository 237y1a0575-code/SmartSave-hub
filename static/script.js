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

// ============= PAYMENT FLOW ENGINE =============

function startPaymentProcess(index, amount) {
  // Show overlay
  const overlay = document.getElementById('payment-overlay');
  const processing = document.getElementById('payment-processing');
  const success = document.getElementById('payment-success');

  if (overlay) {
    overlay.style.display = 'flex';
    overlay.style.opacity = '0';
    overlay.style.animation = 'fadeIn 0.3s forwards';
  }
  if (processing) processing.style.display = 'block';
  if (success) success.style.display = 'none';

  // Simulate Banking Network Delay (1.5s - 2.5s)
  const delay = 1500 + Math.random() * 1000;

  setTimeout(() => {
    executeTransaction(index, amount);
  }, delay);
}

function executeTransaction(index, amount) {
  fetch(`/add-money/${index}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: parseInt(amount) })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        showPaymentSuccess(index, amount, data);
      } else {
        closePaymentOverlay();
        showToast("Transaction Failed: " + (data.error || "Unknown Error"));
      }
    })
    .catch(err => {
      closePaymentOverlay();
      showToast("Network Error. Please try again.");
    });
}

function showPaymentSuccess(index, amount, data) {
  const processing = document.getElementById('payment-processing');
  const success = document.getElementById('payment-success');

  if (processing) processing.style.display = 'none';
  if (success) success.style.display = 'block';

  // Update Receipt Details
  const amountElem = document.getElementById('success-amount');
  if (amountElem) amountElem.innerText = `₹${amount}`;

  const txnIdElem = document.getElementById('txn-id');
  if (txnIdElem) txnIdElem.innerText = 'UPI' + Math.floor(10000000 + Math.random() * 90000000); // 8 digit simulated ID

  const dateElem = document.getElementById('txn-date');
  if (dateElem) {
    const now = new Date();
    dateElem.innerText = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}, Today`;
  }

  // Update UI in background
  updateGoalCard(index, data);

  // Formatting for completion
  if (data.is_completed) {
    if (typeof confetti !== 'undefined') {
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 }, zIndex: 4000 });
    }
    // Save completion state for reload
    localStorage.setItem('just_completed', data.name);
  }
}

function closePaymentOverlay() {
  const overlay = document.getElementById('payment-overlay');
  if (overlay) {
    overlay.style.animation = 'fadeOut 0.3s forwards';
    setTimeout(() => {
      overlay.style.display = 'none';

      // If a goal was just completed, reload now to show full state
      if (localStorage.getItem('just_completed')) {
        location.reload();
      }
    }, 300);
  }
}

// ============= MAIN ACTION FUNCTIONS =============

// Quick add buttons (+₹10, +₹50)
function addMoney(index, amount) {
  startPaymentProcess(index, amount);
}

// Pay UPI button (uses selected amount)
function payUPI(index, amount) {
  openUpiModal(index, amount);
}

// Custom UPI payment (reads from input field)
function payCustomUPI(index) {
  const input = document.getElementById(`input-amount-${index}`);

  // Check if input has a value
  if (!input || !input.value || input.value.trim() === '') {
    showToast("Please enter an amount first!");
    if (input) input.focus();
    return;
  }

  const val = parseInt(input.value);
  if (!val || val <= 0) {
    showToast("Please enter a valid amount greater than 0.");
    return;
  }

  // Open UPI modal with the entered amount
  openUpiModal(index, val);
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
  // Deprecated: routed to startPaymentProcess for direct calls, 
  // but kept if called directly by legacy code (though we updated callers below)
  startPaymentProcess(index, amount);
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

function shareApp() {
  const url = 'https://smart-save-hub.vercel.app'; // Hardcoded for better sharing experience
  navigator.clipboard.writeText(url).then(() => {
    showToast('Project Link copied! Ready to share. ');
  }).catch(() => {
    // Fallback
    showToast('Could not copy automatically. URL: ' + url);
  });
}

