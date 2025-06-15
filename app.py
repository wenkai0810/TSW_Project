from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

def query_cards(user_income, filter_type="all"):
    if filter_type in ["FreeCard", "BudgetCard", "PremiumCard"]:
        card_type_clause = f"?card a :{filter_type} ."
        income_filter = ""
    else:
        card_type_clause = "?card a :CreditCard ."
        if user_income >= 999999999:
            income_filter = ""
        else:
            income_filter = f'FILTER (xsd:decimal(?minIncome) <= "{user_income}"^^xsd:decimal)'

    sparql_query = f"""
    PREFIX : <http://example.org/card#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

    SELECT ?cardName ?bank ?annualFee ?imageUrl ?interestRate ?minIncome
    WHERE {{
      {card_type_clause}
      ?card :cardName ?cardName ;
            :bank ?bank ;
            :annualFee ?annualFee ;
            :interestRate ?interestRate ;
            :minIncome ?minIncome .
      OPTIONAL {{ ?card :imageUrl ?imageUrl }}
      {income_filter}
    }}
    """

    print("📄 Final SPARQL Query:\n", sparql_query)

    try:
        response = requests.post(
            "http://localhost:3030/credit_cards/sparql",
            headers={"Content-Type": "application/sparql-query"},
            data=sparql_query
        )

        if response.status_code != 200:
            print("❌ SPARQL query failed with status:", response.status_code)
            return {"error": "SPARQL query failed", "details": response.text}

        return response.json()

    except Exception as e:
        print("❌ Exception while querying Fuseki:", e)
        return {"error": "Exception occurred", "details": str(e)}


@app.route('/get-cards', methods=['POST'])
def get_cards():
    data = request.get_json()
    income = float(data.get("income", 0))
    filter_type = data.get("filterType", "all")
    print(f"🚀 Received get-cards request | Income: {income}, Filter: {filter_type}")

    results = query_cards(income, filter_type)
    print("🔎 Raw SPARQL response:", results)

    if "error" in results:
        return jsonify(results), 500

    try:
        bindings = results["results"]["bindings"]
        cards = []
        for binding in bindings:
            min_income = float(binding["minIncome"]["value"])
            if min_income > income:
                print(f"⚠️ Skipping card {binding['cardName']['value']} with minIncome {min_income} > userIncome {income}")
                continue

            card = {
                "name": binding["cardName"]["value"],
                "bank": binding["bank"]["value"],
                "annualFee": binding["annualFee"]["value"],
                "interestRate": binding["interestRate"]["value"],
                "minIncome": binding["minIncome"]["value"],
                "imageUrl": binding.get("imageUrl", {}).get("value", "")
            }
            cards.append(card)

        print("✅ Returning cards to frontend:", cards)
        return jsonify(cards)

    except Exception as e:
        print("❌ Failed to parse SPARQL result bindings:", e)
        return jsonify({"error": "Failed to parse bindings", "details": str(e)}), 500


@app.route('/get-cards-by-bank', methods=['POST'])
def get_cards_by_bank():
    data = request.get_json()
    income = float(data.get("income", 0))
    bank = data.get("bank", "")
    print(f"🎯 Fetching all card details from bank '{bank}' with income <= {income}")

    sparql_query = f"""
    PREFIX : <http://example.org/card#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

    SELECT ?cardName ?bank ?annualFee ?imageUrl ?interestRate ?minIncome
    WHERE {{
      ?card a :CreditCard ;
            :cardName ?cardName ;
            :bank ?bank ;
            :annualFee ?annualFee ;
            :interestRate ?interestRate ;
            :minIncome ?minIncome .
      OPTIONAL {{ ?card :imageUrl ?imageUrl }}

      FILTER (
        lcase(str(?bank)) = lcase("{bank}") &&
        xsd:decimal(?minIncome) <= xsd:decimal("{income}")
      )
    }}
    """
    print("📄 SPARQL Query for bank + income:\n", sparql_query)

    try:
        response = requests.post(
            "http://localhost:3030/credit_cards/sparql",
            headers={"Content-Type": "application/sparql-query"},
            data=sparql_query
        )

        if response.status_code != 200:
            print("❌ SPARQL query failed:", response.status_code)
            return jsonify({"error": "SPARQL query failed", "details": response.text}), 500

        results = response.json()
        bindings = results["results"]["bindings"]
        cards = []
        for binding in bindings:
            min_income = float(binding["minIncome"]["value"])
            if min_income > income:
                print(f"⚠️ Skipping card {binding['cardName']['value']} with minIncome {min_income} > userIncome {income}")
                continue

            card = {
                "name": binding["cardName"]["value"],
                "bank": binding["bank"]["value"],
                "annualFee": binding["annualFee"]["value"],
                "interestRate": binding["interestRate"]["value"],
                "minIncome": binding["minIncome"]["value"],
                "imageUrl": binding.get("imageUrl", {}).get("value", "")
            }
            cards.append(card)

        print("✅ Filtered cards by bank and income:", cards)
        return jsonify(cards)

    except Exception as e:
        print("❌ Exception during SPARQL request:", e)
        return jsonify({"error": "Exception occurred", "details": str(e)}), 500


if __name__ == '__main__':
    app.run(port=5000, debug=True)
