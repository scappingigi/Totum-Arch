import http.server
import socketserver
import json
import os
import sys

PORT = 8022
RUNNING_PORT = PORT
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class LayoutSyncHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_POST(self):
        if self.path == '/api/save-layout':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                layout_data = json.loads(post_data.decode('utf-8'))
                target_file = os.path.join(DIRECTORY, 'default_positions.json')
                with open(target_file, 'w', encoding='utf-8') as f:
                    json.dump(layout_data, f, indent=2)
                print(f"[LAYOUT SYNC] Successfully saved master layout with {len(layout_data)} elements to {target_file}")

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "ok", "saved": len(layout_data)}).encode('utf-8'))
                return
            except Exception as e:
                print(f"[LAYOUT SYNC ERROR] {e}")
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
                return
        
        self.send_response(404)
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/config':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            is_read_only = (RUNNING_PORT == 8020)
            config = {
                "readOnly": is_read_only,
                "port": RUNNING_PORT
            }
            self.wfile.write(json.dumps(config).encode('utf-8'))
            return

        # Disable caching headers so edits and default_positions.json are always fresh
        super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

if __name__ == '__main__':
    port = PORT
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print(f"Invalid port: {sys.argv[1]}. Using default {PORT}")

    RUNNING_PORT = port
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", port), LayoutSyncHandler) as httpd:
        print(f"Serving HTTP on port {port} with Layout Sync API enabled...")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
            httpd.server_close()
