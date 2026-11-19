"""
SmartMart RAG - Single Terminal Launcher
Starts both Flask backend (port 5000) and Vite frontend (port 5173) together.
Run: python start.py
Stop: Press Ctrl+C once — both servers will shut down cleanly.
"""
import subprocess
import sys
import os
import time
import threading
from pathlib import Path

ROOT = Path(__file__).parent
FRONTEND_DIR = ROOT / "frontend"

# ANSI colors for pretty output
CYAN   = "\033[96m"
GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

def stream_output(process, prefix, color):
    """Stream a process's output line by line with a colored prefix."""
    for line in iter(process.stdout.readline, b''):
        text = line.decode("utf-8", errors="replace").rstrip()
        if text:
            print(f"{color}{BOLD}[{prefix}]{RESET} {text}")
    for line in iter(process.stderr.readline, b''):
        text = line.decode("utf-8", errors="replace").rstrip()
        if text:
            print(f"{RED}{BOLD}[{prefix} ERR]{RESET} {text}")

def main():
    os.system("") # Enable ANSI colors on Windows terminal

    print(f"\n{BOLD}{'='*60}{RESET}")
    print(f"{GREEN}{BOLD}  🛒 SmartMart RAG — Starting All Servers{RESET}")
    print(f"{BOLD}{'='*60}{RESET}")
    print(f"{CYAN}  Backend  → http://127.0.0.1:5000{RESET}")
    print(f"{CYAN}  Frontend → http://127.0.0.1:5173{RESET}")
    print(f"{YELLOW}  Press Ctrl+C to stop both servers{RESET}")
    print(f"{BOLD}{'='*60}{RESET}\n")

    # ── Start Flask Backend ───────────────────────────────────────
    print(f"{GREEN}[LAUNCH]{RESET} Starting Flask backend...")
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "backend.app"],
        cwd=str(ROOT),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    # Give backend a moment to boot before frontend starts
    time.sleep(2)

    # ── Start Vite Frontend ───────────────────────────────────────
    print(f"{CYAN}[LAUNCH]{RESET} Starting Vite frontend...")

    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    frontend_proc = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=str(FRONTEND_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    # ── Stream both outputs in background threads ─────────────────
    t1 = threading.Thread(
        target=stream_output,
        args=(backend_proc, "BACKEND ", GREEN),
        daemon=True
    )
    t2 = threading.Thread(
        target=stream_output,
        args=(frontend_proc, "FRONTEND", CYAN),
        daemon=True
    )
    t1.start()
    t2.start()

    print(f"\n{BOLD}{'='*60}{RESET}")
    print(f"{GREEN}{BOLD}  ✅ Both servers are running!{RESET}")
    print(f"{GREEN}{BOLD}  👉 Open: http://127.0.0.1:5173{RESET}")
    print(f"{BOLD}{'='*60}{RESET}\n")

    # ── Wait and handle Ctrl+C ────────────────────────────────────
    try:
        backend_proc.wait()
    except KeyboardInterrupt:
        print(f"\n{YELLOW}{BOLD}[STOP]{RESET} Shutting down all servers...")
        backend_proc.terminate()
        frontend_proc.terminate()
        try:
            backend_proc.wait(timeout=5)
            frontend_proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            backend_proc.kill()
            frontend_proc.kill()
        print(f"{GREEN}[STOP]{RESET} ✅ Both servers stopped. Goodbye!\n")
        sys.exit(0)

if __name__ == "__main__":
    main()
