#!/usr/bin/env python3
"""Check syntax of all Python files in the backend."""

import ast
import os
import sys
from pathlib import Path


def check_python_file(filepath):
    """Check if a Python file has valid syntax."""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        ast.parse(content)
        return True, None
    except SyntaxError as e:
        return False, f"Syntax error at line {e.lineno}, column {e.offset}: {e.msg}"
    except Exception as e:
        return False, str(e)


def main():
    """Check syntax of all Python files."""
    backend_dir = Path(__file__).parent
    errors_found = False

    # Directories to skip
    skip_dirs = {
        ".venv",
        "__pycache__",
        "lambda_build",
        "deployment/scripts/lambda_build",
    }

    print("Checking Python syntax in backend directory...")
    print("-" * 60)

    for root, dirs, files in os.walk(backend_dir):
        # Skip specified directories
        dirs[:] = [
            d
            for d in dirs
            if d not in skip_dirs and not any(skip in root for skip in skip_dirs)
        ]

        for file in files:
            if file.endswith(".py"):
                filepath = Path(root) / file
                relative_path = filepath.relative_to(backend_dir)

                valid, error = check_python_file(filepath)
                if valid:
                    print(f"✓ {relative_path}")
                else:
                    print(f"✗ {relative_path}: {error}")
                    errors_found = True

    print("-" * 60)
    if errors_found:
        print("❌ Syntax errors found!")
        return 1
    else:
        print("✅ All Python files have valid syntax!")
        return 0


if __name__ == "__main__":
    sys.exit(main())
