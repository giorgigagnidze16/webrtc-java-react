#!/bin/sh
# Maven Wrapper script for Unix systems
# This script downloads Maven if not present and runs it

set -e

MAVEN_VERSION="3.9.6"
MAVEN_HOME="$HOME/.m2/wrapper/dists/apache-maven-$MAVEN_VERSION"
MAVEN_URL="https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/$MAVEN_VERSION/apache-maven-$MAVEN_VERSION-bin.tar.gz"

# Check if Maven is already installed
if command -v mvn >/dev/null 2>&1; then
    exec mvn "$@"
fi

# Check if we have a cached Maven
if [ -d "$MAVEN_HOME/bin" ]; then
    exec "$MAVEN_HOME/bin/mvn" "$@"
fi

echo "Downloading Maven $MAVEN_VERSION..."
mkdir -p "$HOME/.m2/wrapper/dists"

# Download and extract Maven
if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$MAVEN_URL" | tar -xz -C "$HOME/.m2/wrapper/dists"
elif command -v wget >/dev/null 2>&1; then
    wget -qO- "$MAVEN_URL" | tar -xz -C "$HOME/.m2/wrapper/dists"
else
    echo "Error: curl or wget required to download Maven"
    exit 1
fi

exec "$MAVEN_HOME/bin/mvn" "$@"
