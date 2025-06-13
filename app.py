from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

def query_cards(user_income, filter_type="all"):
    # SPARQL class clause
    if filter_type == "FreeCard":
        card_type_clause = "?card a :FreeCard ."
        income_filter = ""  # No need for income filtering
    elif filter_type == "BudgetCard":
        card_type_clause = "?card a :BudgetCard ."
        income_filter = ""
    elif filter_type == "PremiumCard":
        card_type_clause = "?card a :PremiumCard ."
        income_filter = ""
    else:  # "all" or unknown
        card_type_clause = "?card a :CreditCard ."
        income_filter = f"""
            ?card :minIncome ?income .
            FILTER (?income <= "{user_income}"^^xsd:decimal)
        """

    sparql_query = f"""
    PREFIX : <http://example.org/card#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

    SELECT ?cardName ?bank ?annualFee ?imageUrl ?interestRate ?minIncome
    WHERE {{
      {card_type_clause}
      ?card :cardName ?cardName ;
            :bank ?bank ;
            :minIncome ?minIncome;
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
