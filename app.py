from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)  # CORS-ты қосу

# Airtable конфигурациясы
AIRTABLE_API_KEY = 'patLux91aLqRkfqxs.24af3f04b59d632d532084de35e510cb3c88bda0eb05ee9cc4729f203b5ed00e'
AIRTABLE_BASE_ID = 'apptd9IfAuRlEyhNA'
AIRTABLE_TABLE_NAME = 'Table 1'

FIELD_EVENT = "Мероприятие"
FIELD_DATE = "Дата"
FIELD_TIME = "Время"
FIELD_SEAT = "Место"
FIELD_STATUS = "Статус оплаты"

STATUS_UNPAID = "Не оплачено"
STATUS_PAID = "Оплачено"

@app.route("/getBookedSeats", methods=["GET"])
def get_booked_seats():
    title = request.args.get("title")
    date = request.args.get("date")
    time = request.args.get("time")

    if not title or not date or not time:
        return jsonify({"success": False, "error": "Missing title, date or time"}), 400

    formula = f"AND({{{FIELD_EVENT}}}='{title}'," \
              f"IS_SAME({{{FIELD_DATE}}}, DATETIME_PARSE('{date}', 'YYYY-MM-DD'), 'day')," \
              f"{{{FIELD_TIME}}}='{time}'," \
              f"OR({{{FIELD_STATUS}}}='{STATUS_UNPAID}', {{{FIELD_STATUS}}}='{STATUS_PAID}'))"

    url = f"https://api.airtable.com/v0/{AIRTABLE_BASE_ID}/{AIRTABLE_TABLE_NAME}"
    headers = {"Authorization": f"Bearer {AIRTABLE_API_KEY}"}
    params = {
        "filterByFormula": formula,
        "fields[]": [FIELD_SEAT]
    }

    try:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        data = response.json()
        booked = [record["fields"][FIELD_SEAT]
                  for record in data.get("records", [])
                  if FIELD_SEAT in record.get("fields", {})]
        return jsonify({"success": True, "booked": booked})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)
