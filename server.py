import http.server
import json
import os
import re
import urllib.request
from urllib.parse import urlparse

PORT = 8080
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "gifts.json")


def load_gifts():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_gifts(gifts):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(gifts, f, ensure_ascii=False, indent=2)


class WishlistHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def _send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/gifts":
            self._send_json(load_gifts())
            return
        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        length = int(self.headers.get("Content-Length", 0))
        raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
        try:
            payload = json.loads(raw_body)
        except json.JSONDecodeError:
            self._send_json({"error": "Invalid JSON"}, 400)
            return

        if parsed.path == "/api/gifts":
            gifts = load_gifts()
            # Upsert or append
            gift_id = payload.get("id")
            updated = False
            for idx, item in enumerate(gifts):
                if item.get("id") == gift_id:
                    gifts[idx] = payload
                    updated = True
                    break
            if not updated:
                gifts.insert(0, payload)
            save_gifts(gifts)
            self._send_json(gifts)
            return

        if parsed.path == "/api/gifts/replace":
            if isinstance(payload, list):
                save_gifts(payload)
                self._send_json(payload)
            else:
                self._send_json({"error": "Expected list"}, 400)
            return

        if parsed.path == "/api/reserve":
            gift_id = payload.get("id")
            reserved_by = payload.get("reservedBy")
            reserved_at = payload.get("reservedAt")
            gifts = load_gifts()
            for item in gifts:
                if item.get("id") == gift_id:
                    item["reservedBy"] = reserved_by
                    item["reservedAt"] = reserved_at
                    break
            save_gifts(gifts)
            self._send_json(gifts)
            return

        if parsed.path == "/api/delete":
            gift_id = payload.get("id")
            gifts = [g for g in load_gifts() if g.get("id") != gift_id]
            save_gifts(gifts)
            self._send_json(gifts)
            return

        if parsed.path == "/api/extract-url":
            target_url = payload.get("url", "").strip()
            if not target_url.startswith("http"):
                self._send_json({"error": "Invalid URL"}, 400)
                return
            try:
                req = urllib.request.Request(
                    target_url,
                    headers={
                        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
                    },
                )
                with urllib.request.urlopen(req, timeout=6) as resp:
                    html = resp.read(250_000).decode("utf-8", errors="ignore")

                def find_meta(prop):
                    m = re.search(
                        rf'<meta[^>]+(?:property|name)=["\']{prop}["\'][^>]+content=["\']([^"\']+)["\']',
                        html,
                        re.I,
                    )
                    if not m:
                        m = re.search(
                            rf'<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\']{prop}["\']',
                            html,
                            re.I,
                        )
                    return m.group(1).strip() if m else ""

                title = find_meta("og:title") or find_meta("twitter:title")
                if not title:
                    t_match = re.search(r"<title[^>]*>([^<]+)</title>", html, re.I)
                    title = t_match.group(1).strip() if t_match else ""

                image = find_meta("og:image") or find_meta("twitter:image")
                description = find_meta("og:description") or find_meta("description")
                price_str = (
                    find_meta("product:price:amount")
                    or find_meta("og:price:amount")
                    or ""
                )
                domain = urlparse(target_url).netloc.replace("www.", "").split(".")[0].capitalize()

                self._send_json(
                    {
                        "title": title,
                        "image": image,
                        "description": description,
                        "price": price_str,
                        "storeName": domain,
                    }
                )
            except Exception as e:
                domain = urlparse(target_url).netloc.replace("www.", "").split(".")[0].capitalize()
                self._send_json(
                    {
                        "title": "",
                        "image": "",
                        "description": "",
                        "price": "",
                        "storeName": domain,
                        "warning": str(e),
                    }
                )
            return

        self._send_json({"error": "Not found"}, 404)


if __name__ == "__main__":
    print(f"🎄 Serveur Liste de Noël démarré sur http://localhost:{PORT}")
    server = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), WishlistHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
