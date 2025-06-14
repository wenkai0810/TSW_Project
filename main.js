// Logout
function logout() {
  auth.signOut().then(() => {
    alert("You have been logged out.");
    location.reload();
  });
}

// ===== Firebase Auth State Handler =====
firebase.auth().onAuthStateChanged(user => {
  const userStatus = document.getElementById("userStatus");
  const logoutBtn = document.getElementById("logoutBtn");
  const loginBtn = document.getElementById("loginBtn");
  const registerBtn = document.getElementById("registerBtn");
  const getStartedBtn = document.getElementById("getStartedBtn");
  const settingsBtn = document.getElementById("settingsBtn");

  if (user && user.emailVerified) {
    userStatus.innerHTML = `Logged in as <strong>${user.email}</strong>`;
    logoutBtn.classList.remove("d-none");
    loginBtn.classList.add("d-none");
    registerBtn.classList.add("d-none");
    getStartedBtn?.classList.add("d-none");
    settingsBtn?.classList.remove("d-none");

    db.collection("users").doc(user.uid).get().then(doc => {
      if (doc.exists) {
        const data = doc.data();
        auth.currentUserIncome = data.income;
        auth.userPreference = {
          bank: data.preferredBank || "",
          interest: data.interest || 10
        };
        fetchAndDisplayCards(data.income, "all");
        document.getElementById("updateIncome").value = data.income;
        document.getElementById("updateBank").value = data.preferredBank;
        document.getElementById("updateInterest").value = data.interest;
        document.getElementById("updateInterestValue").innerText = data.interest + "%";
      }
    });
  } else {
    userStatus.innerHTML = "";
    logoutBtn.classList.add("d-none");
    loginBtn.classList.remove("d-none");
    registerBtn.classList.remove("d-none");
    getStartedBtn?.classList.remove("d-none");
    settingsBtn?.classList.add("d-none");
    fetchAndDisplayCards(999999999, "all");
  }
});

// ===== Logout =====
function logout() {
  auth.signOut().then(() => {
    alert("You have been logged out.");
    location.reload();
  });
}

// ===== Registration =====
document.getElementById("registerForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const income = parseInt(document.getElementById("income").value);
  const preferredBank = document.getElementById("preferredBank").value;
  const interest = parseFloat(document.getElementById("preferredInterestRate").value);

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    await db.collection("users").doc(user.uid).set({
      email, income, preferredBank, interest, appliedCards: []
    });

    alert("Registration successful! Please verify your email.");
    user.sendEmailVerification();
    bootstrap.Modal.getInstance(document.getElementById("registerModal")).hide();
  } catch (error) {
    console.error("Error registering:", error);
    alert(error.message);
  }
});

// ===== Login =====
document.getElementById("loginForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  auth.signInWithEmailAndPassword(email, password)
    .then(userCredential => {
      if (!userCredential.user.emailVerified) {
        alert("Please verify your email first.");
        return;
      }
      alert("✅ Login successful!");
      document.getElementById("loginForm").reset();
      bootstrap.Modal.getInstance(document.getElementById("loginModal")).hide();
    })
    .catch(error => {
      alert("❌ " + error.message);
    });
});

// ===== Fetch & Display Cards =====
let allCardsCache = [];

async function fetchAndDisplayCards(income, filterType = "all") {
  try {
    const res = await fetch("http://localhost:5000/get-cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ income, filterType })
    });
    const cards = await res.json();
    allCardsCache = cards;
    renderCards(cards);

    if (auth.currentUser && auth.currentUserIncome && cards.length >= 3) {
      const pref = auth.userPreference || {};
      showTop3Recommendations(cards, auth.currentUserIncome, pref.bank, pref.interest);
    }
  } catch (err) {
    console.error(err);
    alert("❌ Failed to load recommendations.");
  }
}

function renderCards(cards) {
  const container = document.getElementById("cardsContainer");
  container.innerHTML = "";

  if (!cards.length) {
    container.innerHTML = "<p class='text-center'>No cards available for this filter.</p>";
    return;
  }

  cards.forEach(card => {
    container.innerHTML += `
      <div class="col-6 col-md-4 col-lg-3 mb-4">
        <div class="card h-100 shadow-sm">
          <img src="${card.imageUrl}" class="card-img-top" style="max-height: 80px; object-fit: contain; background:#f9f9f9;">
          <div class="card-body p-2">
            <h6 class="card-title mb-1">${card.name}</h6>
            <p class="mb-0">Bank: ${card.bank}</p>
            <p class="mb-0">Annual Fee: RM${card.annualFee}</p>
            <p class="mb-0">Interest Rate: ${card.interestRate}%</p>
            <p class="mb-2">Min Income: RM${card.minIncome}</p>
            <button class="btn btn-success btn-sm w-100" onclick="applyCard('${card.name}')">Apply Now</button>
          </div>
        </div>
      </div>
    `;
  });

  document.getElementById("recommendationResults").classList.remove("d-none");
}

// ===== Filter Cards =====
function filterCards(type) {
  const income = auth.currentUserIncome ?? 999999999;
  fetchAndDisplayCards(income, type);
}

// ===== Apply for Card =====
function applyCard(cardName) {
  const user = auth.currentUser;
  if (!user) {
    alert("🔒 Please register or log in to apply.");
    new bootstrap.Modal(document.getElementById("registerModal")).show();
    return;
  }
  if (!user.emailVerified) {
    alert("✉️ Please verify your email before applying.");
    return;
  }

  db.collection("users").doc(user.uid).get().then(doc => {
    if (!doc.exists) return alert("User data not found.");
    const income = doc.data().income;

    fetch("http://localhost:5050/send-application", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userEmail: user.email, userIncome: income, cardName })
    })
      .then(res => res.ok ? alert("✅ Application sent to admin.") : alert("❌ Failed to send."))
      .catch(err => alert("❌ Error sending application."));
  });
}

// ===== Debounced Search =====
let debounceTimer;
function searchCards() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const keyword = document.getElementById("cardSearchInput").value.trim().toLowerCase();
    if (!keyword) return renderCards(allCardsCache);

    const filtered = allCardsCache.filter(card =>
      card.name.toLowerCase().includes(keyword) ||
      card.bank.toLowerCase().includes(keyword)
    );

    renderCards(filtered);
  }, 250);
}
document.getElementById("cardSearchInput").addEventListener("input", searchCards);

// ===== Recommendation Scoring =====
function scoreCard(card, userIncome, preferredBank = "", preferredRate = 10) {
  let score = 0;
  const incomeGap = Math.abs(card.minIncome - userIncome);

  score += incomeGap <= 1000 ? 3 : incomeGap <= 3000 ? 2 : 1;

  const rateGap = card.interestRate - preferredRate;
  score += rateGap <= 0 ? 3 : rateGap <= 2 ? 2 : rateGap <= 5 ? 1 : -5;

  if (card.bank.toLowerCase() === preferredBank.toLowerCase()) score += 5;

  return score;
}

function showTop3Recommendations(cards, userIncome, bank, interest) {
  const top3 = cards
    .map(c => ({ ...c, score: scoreCard(c, userIncome, bank, interest) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const body = document.getElementById("recommendModalBody");
  body.innerHTML = top3.map(card => `
    <div class="card mb-3 shadow-sm">
      <div class="row g-0">
        <div class="col-md-4 text-center">
          <img src="${card.imageUrl}" class="img-fluid p-3" style="max-height:100px; object-fit:contain;">
        </div>
        <div class="col-md-8">
          <div class="card-body">
            <h5 class="card-title">${card.name}</h5>
            <p class="card-text mb-1">🏦 Bank: ${card.bank}</p>
            <p class="card-text mb-1">💰 Min Income: RM${card.minIncome}</p>
            <p class="card-text mb-1">🔋 Interest Rate: ${card.interestRate}%</p>
            <button class="btn btn-success btn-sm mt-2" onclick="applyCard('${card.name}')">Apply Now</button>
          </div>
        </div>
      </div>
    </div>
  `).join("");

  new bootstrap.Modal(document.getElementById("recommendModal")).show();
}

// ===== Settings Form =====
document.getElementById("settingsForm").addEventListener("submit", e => {
  e.preventDefault();
  const income = parseInt(document.getElementById("updateIncome").value);
  const bank = document.getElementById("updateBank").value;
  const interest = parseFloat(document.getElementById("updateInterest").value);
  const user = firebase.auth().currentUser;

  if (user) {
    db.collection("users").doc(user.uid).update({ income, preferredBank: bank, interest }).then(() => {
      auth.currentUserIncome = income;
      auth.userPreference = { bank, interest };
      bootstrap.Modal.getInstance(document.getElementById("settingsModal")).hide();
      alert("✅ Preferences updated.");
      filterCards("all");
    }).catch(err => {
      alert("❌ Failed to update preferences.");
      console.error(err);
    });
  }
});

