import requests
res = requests.post("http://127.0.0.1:8001/pengiriman/", json={"kode_pengiriman": "TEST-001"})
print(res.status_code, res.text)
