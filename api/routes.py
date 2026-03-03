"""
Flask API routes for tax calculation.
"""
from flask import Blueprint, request, jsonify
from tax_engine.calculator import calculate_full_tax
from elster.field_map import ELSTER_MAP
import config

api = Blueprint("api", __name__, url_prefix="/api")


@api.route("/calculate", methods=["POST"])
def calculate():
    payload = request.get_json()
    if not payload:
        return jsonify({"error": "No JSON payload provided"}), 400
    try:
        result = calculate_full_tax(payload)
        result["elster_hints"] = ELSTER_MAP
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api.route("/constants", methods=["GET"])
def constants():
    return jsonify({
        "tax_year": config.TAX_YEAR,
        "grundfreibetrag": config.GRUNDFREIBETRAG,
        "sparerpauschbetrag_single": config.SPARERPAUSCHBETRAG_SINGLE,
        "sparerpauschbetrag_joint": config.SPARERPAUSCHBETRAG_JOINT,
        "wk_pauschbetrag": config.WK_PAUSCHBETRAG,
        "homeoffice_daily": config.HOMEOFFICE_DAILY,
        "homeoffice_max_days": config.HOMEOFFICE_MAX_DAYS,
        "pendler_rate_first_20": config.PENDLER_RATE_FIRST_20,
        "pendler_rate_from_21": config.PENDLER_RATE_FROM_21,
        "abgeltung_rate": config.ABGELTUNG_RATE,
        "kindergeld_monthly": config.KINDERGELD_MONTHLY_2025,
        "kinderfreibetrag_total": config.KINDERFREIBETRAG_TOTAL_PER_CHILD,
        "bundeslaender": config.BUNDESLAENDER,
        "kirchensteuer_rates": config.KIRCHENSTEUER_RATE,
        "teilfreistellung": config.TEILFREISTELLUNG,
    })


@api.route("/elster-map", methods=["GET"])
def elster_map():
    return jsonify(ELSTER_MAP)
