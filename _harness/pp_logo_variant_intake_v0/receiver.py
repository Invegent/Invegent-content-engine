import http.server, os, sys, urllib.parse, hashlib

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "source")

class H(http.server.BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "content-type, x-relpath")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Access-Control-Max-Age", "600")

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_POST(self):
        rel = self.headers.get("x-relpath", "")
        rel = urllib.parse.unquote(rel)
        # sanitise: no absolute, no traversal
        rel = rel.replace("\\", "/").lstrip("/")
        if ".." in rel.split("/") or not rel:
            self.send_response(400); self._cors(); self.end_headers()
            self.wfile.write(b"bad path"); return
        n = int(self.headers.get("content-length", 0))
        data = self.rfile.read(n)
        dest = os.path.join(ROOT, *rel.split("/"))
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, "wb") as f:
            f.write(data)
        sha = hashlib.sha256(data).hexdigest()
        self.send_response(200)
        self._cors()
        self.send_header("content-type", "application/json")
        self.end_headers()
        self.wfile.write(('{"rel":"%s","bytes":%d,"sha256":"%s"}' % (rel, len(data), sha)).encode())

    def log_message(self, *a):
        pass

if __name__ == "__main__":
    os.makedirs(ROOT, exist_ok=True)
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8931
    print(f"listening on 127.0.0.1:{port}, root={ROOT}", flush=True)
    http.server.HTTPServer(("127.0.0.1", port), H).serve_forever()
