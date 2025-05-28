from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests from your frontend

# Query cards from Apache Jena Fuseki
def query_cards(user_income):
    sparql_query = f"""
    PREFIX : <http://example.org/card#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
    SELECT ?cardName ?bank ?annualFee ?imageUrl ?interestRate
    WHERE {{
      ?card a :CreditCard ;
            :cardName ?cardName ;
            :bank ?bank ;
            :minIncome ?income ;
            :annualFee ?annualFee ;
            :interestRate ?interestRate .
      OPTIONAL {{ ?card :imageUrl ?imageUrl }}
      FILTER (?income <= "{user_income}"^^xsd:decimal)
    }}
    """

    response = requests.post(
        "http://localhost:3030/credit_cards/sparql",
        headers={"Content-Type": "application/sparql-query"},
        data=sparql_query
    )

    if response.status_code != 200:
        return {"error": "SPARQL query failed", "details": response.text}

    return response.json()


@app.route('/get-cards', methods=['POST'])
def get_cards():
    data = request.get_json()
    income = data.get("income", 0)
    print("🚀 Income received:", income)

    results = query_cards(income)
    print("🔎 Raw SPARQL response:", results)

    if "error" in results:
        return jsonify(results), 500

    cards = []
    for binding in results["results"]["bindings"]:
        print("📦 Card binding:", binding)
        card = {
            "name": binding["cardName"]["value"],
            "bank": binding["bank"]["value"],
            "annualFee": binding["annualFee"]["value"],
            "interestRate": binding["interestRate"]["value"],
            "imageUrl": binding.get("imageUrl", {}).get("value", "")
        }
        cards.append(card)

    print("✅ Final cards to frontend:", cards)
    return jsonify(cards)


if __name__ == '__main__':
    app.run(port=5000, debug=True)
