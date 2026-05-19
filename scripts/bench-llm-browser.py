#!/usr/bin/env python
"""Drive the /test page LLM benchmarking suite from a real Chromium tab.

Usage:
  scripts/bench-llm-browser.py                      # http://localhost:8400/test
  scripts/bench-llm-browser.py --url http://host:8000/test
  scripts/bench-llm-browser.py --model Qwen3-VL-4B-Q8_0
  scripts/bench-llm-browser.py --headless           # NB: no GPU in headless

The app must already be reachable at the given URL (sudo docker compose up).
The script clicks "Run benchmark", then polls the on-page status banner and
results table once per --poll-interval seconds and mirrors every status
change and every freshly-appended row to stdout, so a long run can be
inspected as it goes. Ctrl-C clicks the page's Cancel button, waits for
the in-flight combination to finish, prints the partial sorted table,
then exits cleanly. A second Ctrl-C hard-exits.

The browser console is mirrored too (warnings + errors only by default,
everything with --verbose) so wllama / llama.cpp native log lines show up
inline next to the bench progress.

Written for the Playwright build pinned in requirements-dev.txt; run via
the project venv: .venv/bin/python scripts/bench-llm-browser.py
"""

from __future__ import annotations

import argparse
import signal
import sys
import time
from datetime import datetime

from playwright.sync_api import (
    Error as PlaywrightError,
    TimeoutError as PlaywrightTimeoutError,
    sync_playwright,
)


DONE_PREFIXES = ("Benchmark complete", "Benchmark failed", "Cancelled")


def ts() -> str:
    return datetime.now().strftime("%H:%M:%S")


def log(line: str) -> None:
    # One-line, timestamped, flushed: stdout may be piped to tee / a log
    # file and we want partial progress visible immediately.
    print(f"{ts()} {line}", flush=True)


def fmt_row(cells: list[str]) -> str:
    return " | ".join(c.replace("\n", " ").strip() for c in cells)


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser(
        description="Run the /test page LLM benchmark in a real Chromium tab "
        "and stream progress to stdout.",
    )
    ap.add_argument(
        "--url",
        default="http://localhost:8400/test",
        help="URL of the /test page (default: %(default)s).",
    )
    ap.add_argument(
        "--model",
        default=None,
        help="Name to pick in the model dropdown. Must match an option exactly. "
        "Omit to use whatever option is selected by default (first entry).",
    )
    ap.add_argument(
        "--headless",
        action="store_true",
        help="Run Chromium headless. WebGPU / GPU offload combinations will "
        "fall back to CPU under headless, so prefer headed for fair numbers.",
    )
    ap.add_argument(
        "--poll-interval",
        type=float,
        default=1.0,
        help="Seconds between status / row polls (default: %(default)s).",
    )
    ap.add_argument(
        "--ready-timeout",
        type=float,
        default=120.0,
        help="Seconds to wait for the page and model picker to be ready "
        "(default: %(default)s).",
    )
    ap.add_argument(
        "--max-wall-seconds",
        type=float,
        default=3600.0,
        help="Hard ceiling for the whole sweep (default: %(default)s). The "
        "script clicks Cancel and exits if exceeded.",
    )
    ap.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Mirror every browser console message, not just warn/error.",
    )
    return ap.parse_args()


def install_console_mirror(page, verbose: bool) -> None:
    def on_console(msg):
        kind = msg.type
        if not verbose and kind not in ("warning", "error"):
            return
        # Playwright spells it 'warning' but the matching console.* is 'warn'.
        short = {"warning": "warn"}.get(kind, kind)
        try:
            text = msg.text
        except Exception:
            text = "(unreadable console message)"
        log(f"[console:{short}] {text}")

    def on_pageerror(err):
        log(f"[pageerror] {err}")

    page.on("console", on_console)
    page.on("pageerror", on_pageerror)


def wait_for_ready(page, timeout_seconds: float) -> None:
    """Wait until the bench can actually start: page loaded, model picker
    populated, run button enabled."""
    page.wait_for_selector("#llm-bench-run", timeout=timeout_seconds * 1000)
    # Picker starts with a placeholder "Loading..." option, then is
    # repopulated by populateModelPicker(). Wait for a real option to land.
    page.wait_for_function(
        """() => {
          const sel = document.getElementById('llm-diag-model');
          if (!sel || sel.disabled) return false;
          if (!sel.options || sel.options.length === 0) return false;
          // Either at least one named option, or the explicit
          // "(default URL, no self-hosted models)" placeholder counts as ready.
          const first = sel.options[0];
          return first && first.textContent && first.textContent !== 'Loading...';
        }""",
        timeout=timeout_seconds * 1000,
    )


def select_model(page, name: str) -> None:
    available = page.eval_on_selector_all(
        "#llm-diag-model option",
        "opts => opts.map(o => o.value)",
    )
    if name not in available:
        log(f"[error] model '{name}' not in picker. available: {available}")
        raise SystemExit(2)
    page.select_option("#llm-diag-model", name)
    log(f"[setup] selected model: {name}")


def snapshot_status(page) -> str:
    try:
        return page.locator("#llm-bench-status").inner_text(timeout=2000).strip()
    except (PlaywrightTimeoutError, PlaywrightError):
        return ""


def snapshot_rows(page) -> list[list[str]]:
    try:
        rows = page.locator("#llm-bench-tbody tr").all()
    except (PlaywrightTimeoutError, PlaywrightError):
        return []
    out: list[list[str]] = []
    for row in rows:
        try:
            cells = row.locator("td").all_text_contents()
        except (PlaywrightTimeoutError, PlaywrightError):
            cells = []
        out.append(cells)
    return out


def click_cancel(page) -> None:
    try:
        page.click("#llm-bench-cancel", timeout=2000)
        log("[bench] clicked Cancel; waiting for current combination to settle.")
    except (PlaywrightTimeoutError, PlaywrightError) as exc:
        log(f"[bench] could not click Cancel: {exc}")


def print_final_table(rows: list[list[str]]) -> None:
    if not rows:
        log("[final] no rows recorded.")
        return
    log("[final] table (sorted by OCR tok/s):")
    for i, cells in enumerate(rows, 1):
        print(f"  {i:>2}. {fmt_row(cells)}", flush=True)


def main() -> int:
    args = parse_args()
    if args.headless:
        log(
            "[warn] --headless disables Chromium's GPU; CPU vs GPU combinations "
            "will not be representative of headed performance."
        )

    cancel_state = {"requested": False}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=args.headless)
        # COOP/COEP comes from the FastAPI app; SharedArrayBuffer / wllama
        # multi-thread WASM rely on it, so we do nothing special here.
        context = browser.new_context()
        page = context.new_page()
        install_console_mirror(page, args.verbose)
        log(f"[setup] opening {args.url}")
        try:
            page.goto(args.url, wait_until="domcontentloaded", timeout=args.ready_timeout * 1000)
        except PlaywrightError as exc:
            log(f"[error] failed to open {args.url}: {exc}")
            browser.close()
            return 2

        try:
            wait_for_ready(page, args.ready_timeout)
        except PlaywrightTimeoutError:
            log(
                f"[error] /test page did not become ready within "
                f"{args.ready_timeout}s. Is the app running and serving models?"
            )
            browser.close()
            return 2

        if args.model:
            select_model(page, args.model)

        # Wire Ctrl-C to click Cancel on the page. A second Ctrl-C aborts
        # the script outright; the browser may leave the wllama worker
        # running until process exit, but the OS reaps it on close().
        def handle_sigint(signum, frame):
            if cancel_state["requested"]:
                log("[bench] second Ctrl-C; exiting hard.")
                raise SystemExit(130)
            cancel_state["requested"] = True
            log("[bench] Ctrl-C received; cancelling on the page (Ctrl-C again to force exit).")
            click_cancel(page)

        signal.signal(signal.SIGINT, handle_sigint)

        log("[bench] clicking Run benchmark.")
        try:
            page.click("#llm-bench-run", timeout=10_000)
        except PlaywrightError as exc:
            log(f"[error] could not click Run benchmark: {exc}")
            browser.close()
            return 2

        start_wall = time.monotonic()
        last_status = ""
        last_row_count = 0
        last_rows_snapshot: list[list[str]] = []

        try:
            while True:
                # Hard cap on the whole sweep so a hung wllama instance
                # does not pin the script forever.
                if time.monotonic() - start_wall > args.max_wall_seconds:
                    log(
                        f"[bench] exceeded --max-wall-seconds "
                        f"({args.max_wall_seconds:.0f}s); cancelling."
                    )
                    if not cancel_state["requested"]:
                        cancel_state["requested"] = True
                        click_cancel(page)

                status = snapshot_status(page)
                if status and status != last_status:
                    log(f"[status] {status}")
                    last_status = status

                rows = snapshot_rows(page)
                # Detect newly appended rows (during the sweep rows are
                # append-only; the final sort happens once after status
                # transitions to "Benchmark complete").
                if len(rows) > last_row_count:
                    for cells in rows[last_row_count:]:
                        idx = last_row_count + 1
                        log(f"[row {idx:>2}] {fmt_row(cells)}")
                        last_row_count += 1
                last_rows_snapshot = rows

                if status and status.startswith(DONE_PREFIXES):
                    # Status hit a terminal state. The renderBenchTableSorted
                    # call inside the page may rewrite the row order after
                    # this; give it one more tick to settle, then print
                    # the final order.
                    time.sleep(min(1.0, args.poll_interval))
                    last_rows_snapshot = snapshot_rows(page)
                    print_final_table(last_rows_snapshot)
                    break

                time.sleep(args.poll_interval)
        except SystemExit:
            print_final_table(last_rows_snapshot)
            raise
        finally:
            try:
                browser.close()
            except PlaywrightError:
                pass

    return 0


if __name__ == "__main__":
    sys.exit(main())
