# 💳 Credit Card Recommendation System

An intelligent credit card recommendation system powered by **RDF + OWL ontology** and **SPARQL**. This system helps users find the best credit cards based on their income and preferences (e.g., low fee, premium, budget). It is designed with semantic reasoning using **Apache Jena Fuseki**.

---

## 🚀 Features

- 📊 Filter credit cards by:
  - `FreeCard` – Zero annual fee
  - `BudgetCard` – Suitable for low income + low interest
  - `PremiumCard` – For high income + high interest
- 🧠 OWL reasoning enabled for inferred classifications
- 🔎 Real-time querying using SPARQL
- 🌐 Flask API backend
- 💻 Simple frontend UI for user interaction

---

## ⚙️ Prerequisites

Ensure the following are installed:

- **Apache Jena Fuseki** (v5.4.0+)
- **Python 3.9+**
- **Node.js**

---

## 🧪 Setup and Run (For TSW Project Testing)

Start all services on their respective ports:

```bash
# 1. Flask Backend (http://localhost:5000)
python app.py

# 2. Frontend Static HTML (http://localhost:8080/home.html)
python -m http.server 8080

# 3. Apache Jena Fuseki Server (http://localhost:3030)
cd apache-jena-fuseki-5.4.0
./fuseki-server
if (no data):
  -go to http://localhost:3030
  -create dataset -upload credit_cards_data then all set

# 4. Node.js Email Server (http://localhost:5050 or as defined)
node server.js

# 5. Run this localhost link
http://localhost:8080/home.html
