from flask import jsonify, request
from collections import defaultdict

def geocerca_deep_analysis():
    data = request.json
    print(data)