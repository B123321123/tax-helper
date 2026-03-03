"""
German Tax Helper — Flask entry point.
"""
import sys
import os

# Ensure project root is on path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, send_from_directory
from api.routes import api


def create_app():
    app = Flask(__name__, static_folder="static", static_url_path="/static")
    app.register_blueprint(api)

    @app.route("/")
    def index():
        return send_from_directory("static", "index.html")

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=5055)
