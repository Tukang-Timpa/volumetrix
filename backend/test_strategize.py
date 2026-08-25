import urllib.request
import json

req = urllib.request.Request("http://localhost:8001/pengiriman/1/strategize")
try:
    with urllib.request.urlopen(req) as response:
        for line in response:
            print(line.decode('utf-8').strip())
except Exception as e:
    print(f"Error: {e}")
