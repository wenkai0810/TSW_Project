from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

def query_cards(user_income, filter_type="all"):
    # Class clause
    if filter_type in ["FreeCard", "BudgetCard", "PremiumCard"]:
        card_type_clause = f"?card a :{filter_type} ."
    else:
        card_type_clause = "?card a :CreditCard ."

    # Income filter logic:
    if filter_type == "all":
        # only apply income filter if user is logged in
        if user_income >= 999999999:
            income_filter = ""  # no filtering for guest users
        else:
            income_filter = f"""
                ?card :minIncome ?income .
                FILTER (?income <= "{user_income}"^^xsd:decimal)
            """
    else:
        # for class filters like BudgetCard, always return all of that class (no income filter)
        income_filter = ""

    sparql_query = f"""
    PREFIX : <http://example.org/card#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

    SELECT ?cardName ?bank ?annualFee ?imageUrl ?interestRate ?minIncome
    WHERE {{
      {card_type_clause}
      ?card :cardName ?cardName ;
            :bank ?bank ;
            :minIncome ?minIncome ;
            :annualFee ?annualFee ;
            :interestRate ?interestRate .
      OPTIONAL {{ ?card :imageUrl ?imageUrl }}
      {income_filter}
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
    filter_type = data.get("filterType", "all")
    print(f"🚀 Income: {income}, Filter: {filter_type}")

    results = query_cards(income, filter_type)
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
            "minIncome": binding["minIncome"]["value"], 
            "imageUrl": binding.get("imageUrl", {}).get("value", "")
        }
        cards.append(card)

    print("✅ Final cards to frontend:", cards)
    return jsonify(cards)


if __name__ == '__main__':
    app.run(port=5000, debug=True)
