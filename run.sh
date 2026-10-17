
#!/usr/bin/env bash

set -u
cd "$(dirname "$0")" || exit 1

PORT=5000
URL="http://127.0.0.1:${PORT}"
LOG_FILE="app.log"

echo "=========================================="
echo "       HULK - TYPING APP LAUNCHER"
echo "=========================================="

# CHECK REQUIRED FILES
if [[ ! -f "app.py" ]]; then
    echo "ERROR: APP.PY NOT FOUND."
    exit 1
fi

# FIND PYTHON
if command -v python3 >/dev/null 2>&1; then
    SYSTEM_PYTHON=python3
elif command -v python >/dev/null 2>&1; then
    SYSTEM_PYTHON=python
else
    echo "ERROR: PYTHON IS NOT INSTALLED."
    exit 1
fi

# CREATE VIRTUAL ENVIRONMENT IF NEEDED
if [[ ! -x ".venv/bin/python" ]]; then
    echo "CREATING PYTHON VIRTUAL ENVIRONMENT..."
    "$SYSTEM_PYTHON" -m venv .venv || {
        echo "ERROR: COULD NOT CREATE VIRTUAL ENVIRONMENT."
        echo "ON FEDORA, TRY: sudo dnf install python3"
        exit 1
    }
fi

PYTHON=".venv/bin/python"

# INSTALL REQUIREMENTS
if [[ -f "requirements.txt" ]]; then
    echo "INSTALLING REQUIREMENTS..."
    "$PYTHON" -m pip install -r requirements.txt || {
        echo "ERROR: REQUIREMENTS INSTALLATION FAILED."
        exit 1
    }
else
    echo "WARNING: REQUIREMENTS.TXT NOT FOUND."
fi

# STOP EXISTING SERVER ON PORT 5000
echo "CHECKING PORT ${PORT}..."

if command -v fuser >/dev/null 2>&1; then
    fuser -k -TERM "${PORT}/tcp" 2>/dev/null || true
elif command -v lsof >/dev/null 2>&1; then
    PIDS=$(lsof -ti "tcp:${PORT}" 2>/dev/null || true)
    if [[ -n "$PIDS" ]]; then
        kill -TERM $PIDS 2>/dev/null || true
    fi
else
    echo "ERROR: INSTALL FUSER OR LSOF TO MANAGE PORTS."
    echo "FEDORA: sudo dnf install psmisc"
    exit 1
fi

# WAIT FOR OLD SERVER TO STOP
for i in {1..10}; do
    if ! (echo >/dev/tcp/127.0.0.1/"$PORT") >/dev/null 2>&1; then
        break
    fi
    sleep 1
done

if (echo >/dev/tcp/127.0.0.1/"$PORT") >/dev/null 2>&1; then
    echo "ERROR: PORT ${PORT} IS STILL IN USE."
    exit 1
fi

# START THE APP
echo "STARTING FLASK SERVER..."
nohup "$PYTHON" app.py > "$LOG_FILE" 2>&1 &
SERVER_PID=$!

# WAIT UNTIL WEBSITE RESPONDS
echo "WAITING FOR WEBSITE..."

for i in {1..60}; do
    if curl -fsS "$URL" >/dev/null 2>&1; then
        echo "WEBSITE STARTED SUCCESSFULLY!"
        echo "OPENING: $URL"

        if command -v xdg-open >/dev/null 2>&1; then
            xdg-open "$URL" >/dev/null 2>&1 &
        else
            echo "OPEN THIS URL MANUALLY: $URL"
        fi

        echo "SERVER LOG: $LOG_FILE"
        echo "SERVER PID: $SERVER_PID"
        exit 0
    fi

    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
        echo "ERROR: FLASK SERVER STOPPED."
        echo "CHECK THE LOG BELOW:"
        cat "$LOG_FILE"
        exit 1
    fi

    sleep 1
done

echo "ERROR: WEBSITE DID NOT RESPOND WITHIN 60 SECONDS."
echo "CHECK $LOG_FILE FOR ERRORS."
exit 1
