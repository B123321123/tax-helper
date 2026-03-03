"""
ELSTER form/line mapping for all wizard fields.
Each entry: {form, line, hint (optional)}.
"""

ELSTER_MAP = {
    # --- Anlage N (Employment) ---
    "bruttolohn":               {"form": "Anlage N", "line": "6", "hint": "Lohnsteuerbescheinigung Nr. 3"},
    "lohnsteuer_einbehalten":   {"form": "Anlage N", "line": "11", "hint": "Lohnsteuerbescheinigung Nr. 4"},
    "soli_einbehalten":         {"form": "Anlage N", "line": "12", "hint": "Lohnsteuerbescheinigung Nr. 5"},
    "kist_einbehalten":         {"form": "Anlage N", "line": "13", "hint": "Lohnsteuerbescheinigung Nr. 6"},
    "entfernungspauschale":     {"form": "Anlage N", "line": "31-39", "hint": "Wege zwischen Wohnung und Arbeit"},
    "homeoffice_pauschale":     {"form": "Anlage N", "line": "45", "hint": "Tagespauschale Homeoffice"},
    "other_wk":                 {"form": "Anlage N", "line": "46-48", "hint": "Weitere Werbungskosten"},

    # --- Anlage KAP (Capital) ---
    "dividends":                {"form": "Anlage KAP", "line": "7", "hint": "Kapitalertraege inlaendisch"},
    "interest":                 {"form": "Anlage KAP", "line": "7", "hint": "Zinsen"},
    "realized_gains":           {"form": "Anlage KAP", "line": "7", "hint": "Veraeusserungsgewinne"},
    "already_withheld_kest":    {"form": "Anlage KAP", "line": "37", "hint": "Einbehaltene KapESt"},
    "sparerpauschbetrag":       {"form": "Anlage KAP", "line": "16", "hint": "In Anspruch genommener Sparer-Pauschbetrag"},
    "guenstigerpruefung":       {"form": "Anlage KAP", "line": "4", "hint": "Antrag auf Guenstigerpruefung"},

    # --- Anlage KAP-INV (Funds/ETFs) ---
    "fund_distributions":       {"form": "Anlage KAP-INV", "line": "4-8", "hint": "Ausschuettungen aus Investmentfonds"},
    "vorabpauschale":           {"form": "Anlage KAP-INV", "line": "9-13", "hint": "Vorabpauschale"},
    "fund_sale_gains":          {"form": "Anlage KAP-INV", "line": "14-18", "hint": "Veraeusserungsgewinn Fondsanteile"},

    # --- Anlage S / EUeR (Freelance) ---
    "einnahmen_selbst":         {"form": "Anlage S", "line": "4", "hint": "Gewinn aus selbstaendiger Arbeit"},
    "betriebsausgaben":         {"form": "Anlage EUeR", "line": "div.", "hint": "Betriebsausgaben gesamt"},

    # --- Anlage G (Trade) ---
    "gewinn_gewerbe":           {"form": "Anlage G", "line": "4", "hint": "Gewinn aus Gewerbebetrieb"},

    # --- Anlage V (Rental) ---
    "mieteinnahmen":            {"form": "Anlage V", "line": "9", "hint": "Mieteinnahmen"},
    "nebenkosten_umlagen":      {"form": "Anlage V", "line": "13", "hint": "Umlagen"},
    "schuldzinsen":             {"form": "Anlage V", "line": "37", "hint": "Schuldzinsen fuer Immobiliendarlehen"},
    "afa":                      {"form": "Anlage V", "line": "33", "hint": "Absetzung fuer Abnutzung Gebaeude"},
    "grundsteuer":              {"form": "Anlage V", "line": "47", "hint": "Grundsteuer"},

    # --- Anlage Vorsorgeaufwand ---
    "grv_beitraege":            {"form": "Anlage Vorsorgeaufwand", "line": "4", "hint": "Arbeitnehmeranteil GRV"},
    "ruerup_beitraege":         {"form": "Anlage Vorsorgeaufwand", "line": "8", "hint": "Beitraege Basisrente"},
    "kv_basis":                 {"form": "Anlage Vorsorgeaufwand", "line": "11-16", "hint": "Krankenversicherung Basis"},
    "pv_beitraege":             {"form": "Anlage Vorsorgeaufwand", "line": "17-22", "hint": "Pflegeversicherung"},
    "sonstige_vorsorge":        {"form": "Anlage Vorsorgeaufwand", "line": "45-50", "hint": "BU, Haftpflicht etc."},

    # --- Mantelbogen ESt 1 A ---
    "kirchensteuer_paid":       {"form": "ESt 1 A", "line": "4", "hint": "Gezahlte Kirchensteuer"},
    "spenden":                  {"form": "ESt 1 A", "line": "5", "hint": "Zuwendungen/Spenden"},
    "handwerkerleistungen":     {"form": "ESt 1 A", "line": "6", "hint": "Handwerkerleistungen (Lohnanteil)"},
    "haushaltsnahe_dl":         {"form": "ESt 1 A", "line": "5", "hint": "Haushaltsnahe Dienstleistungen"},

    # --- Anlage Kind ---
    "num_children":             {"form": "Anlage Kind", "line": "6", "hint": "Anzahl Kinder"},
    "kindergeld_received":      {"form": "Anlage Kind", "line": "6", "hint": "Erhaltenes Kindergeld"},
}
