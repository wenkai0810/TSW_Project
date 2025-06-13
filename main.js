function logout() {
  auth.signOut().then(() => {
    alert("You have been logged out.");
    location.reload();
  });
}

firebase.auth().onAuthStateChanged(user => {
  const userStatus = document.getElementById("userStatus");
  const logoutBtn = document.getElementById("logoutBtn");
  const loginBtn = document.getElementById("loginBtn");
  const registerBtn = document.getElementById("registerBtn");
  const getStartedBtn = document.getElementById("getStartedBtn");

  if (user && user.emailVerified) {
    userStatus.innerHTML = `Logged in as <strong>${user.email}</strong>`;
    logoutBtn.classList.remove("d-none");
    loginBtn.classList.add("d-none");
    registerBtn.classList.add("d-none");
    getStartedBtn?.classList.add("d-none");

    db.collection("users").doc(user.uid).get().then(doc => {
      if (doc.exists) {
        const income = doc.data().income;
        auth.currentUserIncome = income;
        fetchAndDisplayCards(income, "all");
      }
    });
  } else {
    userStatus.innerHTML = "";
    logoutBtn.classList.add("d-none");
    loginBtn.classList.remove("d-none");
    registerBtn.classList.remove("d-none");
    getStartedBtn?.classList.remove("d-none");

    // 🔥 Show all cards when user is not logged in
    fetchAndDisplayCards(999999999, "all");
  }
});


document.getElementById("registerForm").addEventListener("submit", function(e) {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const income = parseInt(document.getElementById("income").value);

  auth.createUserWithEmailAndPassword(email, password)
    .then(userCredential => {
      const user = userCredential.user;
      return user.sendEmailVerification()
        .then(() => {
          return db.collection("users").doc(user.uid).set({
            email: email,
            income: income,
            appliedCards: []
          });
        })
        .then(() => {
          alert("✅ Registration successful! Check your email to verify.");
          document.getElementById("registerForm").reset();
          bootstrap.Modal.getInstance(document.getElementById("registerModal")).hide();
        });
    })
    .catch(error => {
      console.error("Registration Error:", error.message);
      alert("❌ " + error.message);
    });
});

document.getElementById("loginForm").addEventListener("submit", function(e) {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  auth.signInWithEmailAndPassword(email, password)
    .then(userCredential => {
      const user = userCredential.user;
      if (!user.emailVerified) {
        alert("Please verify your email first.");
        return;
      }
      alert("✅ Login successful!");
      document.getElementById("loginForm").reset();
      bootstrap.Modal.getInstance(document.getElementById("loginModal")).hide();
    })
    .catch(error => {
      console.error("Login Error:", error.message);
      alert("❌ " + error.message);
    });
});

async function fetchAndDisplayCards(income, filterType = "all") {
  try {
    const response = await fetch("http://localhost:5000/get-cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ income, filterType })
    });

    if (!response.ok) throw new Error("Failed to fetch cards");

    const cards = await response.json();
    renderCards(cards);
  } catch (err) {
    console.error("Fetch error:", err);
    alert("❌ Failed to load recommendations.");
  }
}

function renderCards(cards) {
  const container = document.getElementById("cardsContainer");
  container.innerHTML = "";

  if (!cards.length) {
    container.innerHTML = "<p class='text-center'>No cards available for this filter.</p>";
  }

  cards.forEach(card => {
    container.innerHTML += `
      <div class="col-6 col-md-4 col-lg-3 mb-4">
        <div class="card h-100 shadow-sm">
          <img src="${card.imageUrl}" class="card-img-top" alt="${card.name} Image"
               style="max-height: 80px; object-fit: contain; background:#f9f9f9;">
          <div class="card-body p-2">
            <h6 class="card-title mb-1" style="font-size: 0.9rem;">${card.name}</h6>
            <p class="mb-0" style="font-size: 0.8rem;">Bank: ${card.bank}</p>
            <p class="mb-0" style="font-size: 0.8rem;">Annual Fee: RM${card.annualFee}</p>
            <p class="mb-0" style="font-size: 0.8rem;">Interest Rate: ${card.interestRate}% p.a.</p>
            <p class="mb-0" style="font-size: 0.8rem;">Min Income: RM${card.minIncome}</p>
            <button class="btn btn-success btn-sm w-100" onclick="applyCard('${card.name}')">Apply Now</button>
          </div>
        </div>
      </div>
    `;
  });

  document.getElementById("recommendationResults").classList.remove("d-none");
}

function filterCards(type) {
  const income = auth.currentUserIncome ?? 999999999; // fallback for guest
  fetchAndDisplayCards(income, type);
}

function applyCard(cardName) {
  const user = auth.currentUser;

  if (!user) {
    alert("🔒 Please register or log in to apply for a card.");
    const registerModal = new bootstrap.Modal(document.getElementById("registerModal"));
    registerModal.show();
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
      body: JSON.stringify({
        userEmail: user.email,
        userIncome: income,
        cardName: cardName
      })
    })
    .then(res => res.ok ? alert("✅ Application sent to admin.") : alert("❌ Failed to send."))
    .catch(err => {
      console.error("Send error:", err);
      alert("❌ Error sending application.");
    });
  });
}
