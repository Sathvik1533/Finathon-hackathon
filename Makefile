.PHONY: help install lint test ci run clean

help:
	@echo "Available commands:"
	@echo "  make install    - Install project and development dependencies"
	@echo "  make lint       - Run syntax and lint checks"
	@echo "  make test       - Run test suite"
	@echo "  make ci         - Run complete local CI validation suite"
	@echo "  make run        - Run local development server"
	@echo "  make clean      - Clean cache and build artifacts"

install:
	python3 -m pip install -r requirements.txt
	python3 -m pip install -r requirements-dev.txt

lint:
	python3 -m compileall -q -x '(\.venv|venv|\.git|node_modules)/' .

test:
	python3 -m pytest tests/ -v

ci:
	./scripts/ci.sh

run:
	python3 -m uvicorn src.app:app --host 0.0.0.0 --port 8000 --reload

clean:
	rm -rf __pycache__ .pytest_cache .coverage htmlcov dist build
