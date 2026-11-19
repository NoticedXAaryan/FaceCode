#!/usr/bin/env python3
"""Tiny static file server with SPA fallback to index.html."""

from __future__ import annotations

import http.server
import os
import sys
from functools import partial
from pathlib import Path


class SpaHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, directory: str | None = None, **kwargs):
        super().__init__(*args, directory=directory, **kwargs)

    def do_GET(self):  # noqa: N802
        path = Path(self.translate_path(self.path))
        if path.is_file():
            return super().do_GET()
        index = Path(self.directory) / "index.html"
        if index.is_file():
            self.path = "/index.html"
            return super().do_GET()
        self.send_error(404, "File not found")

    def log_message(self, format, *args):  # noqa: A003
        sys.stderr.write("%s - %s\n" % (self.address_string(), format % args))


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    root = sys.argv[2] if len(sys.argv) > 2 else os.getcwd()
    handler = partial(SpaHandler, directory=root)
    with http.server.ThreadingHTTPServer(("127.0.0.1", port), handler) as httpd:
        print(f"spa-server listening on http://127.0.0.1:{port} root={root}", flush=True)
        httpd.serve_forever()


if __name__ == "__main__":
    main()
