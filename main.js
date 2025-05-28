// main.js

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
        console.log("🔥 User doc:", doc.data()); 
        fetchAndDisplayCards(doc.data().income);
      }
    });
  } else {
    userStatus.innerHTML = "";
    logoutBtn.classList.add("d-none");
    loginBtn.classList.remove("d-none");
    registerBtn.classList.remove("d-none");
    getStartedBtn?.classList.remove("d-none");
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

async function fetchAndDisplayCards(income) {
  const response = await fetch("http://localhost:5000/get-cards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ income })
  });

  const cards = await response.json();
  const container = document.getElementById("cardsContainer");
  container.innerHTML = "";

  cards.forEach(card => {
    container.innerHTML += `
      <div class="col-md-6">
        <div class="card mb-3">
          <img src="${card.imageUrl}" class="card-img-top" alt="${card.name} Image" style="height:200px; object-fit:contain; background:#f9f9f9;">
          <div class="card-body">
            <h5 class="card-title">${card.name}</h5>
            <p class="card-text">Bank: ${card.bank}</p>
            <p class="card-text">Annual Fee: RM${card.annualFee}</p>
            <p class="card-text">Interest Rate: ${card.interestRate}% p.a.</p>
            <button class="btn btn-success" onclick="applyCard('${card.name}')">Apply Now</button>
          </div>
        </div>
      </div>
    `;
  });

  document.getElementById("recommendationResults").classList.remove("d-none");
}

function applyCard(cardName) {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) {
    alert("Please log in with a verified email to apply.");
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
