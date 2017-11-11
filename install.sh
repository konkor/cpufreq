#!/bin/bash

echo "Install the extension from GitHub"
echo "Usage: install.sh [BRANCH_NAME]"
echo "Default branch is master"
echo "Dependencies: unzip"

# Check unzip 
command -v unzip >/dev/null 2>&1 || { echo "Error: Please install unzip"; exit 1; } 

EXTENSION_PATH="$HOME/.local/share/gnome-shell/extensions";

# Ensure the extensions directory exist
mkdir -p $EXTENSION_PATH;

# Set URL to extension archive
URL="https://github.com/konkor/cpufreq/archive/";

if [ $# -lt 1 ]
then
    BRANCH='master'
else
    BRANCH=$1
fi
URL=$URL$BRANCH'.zip'

# Extension UUID 
EXTENSION_UUID="cpufreq@konkor";

# Download extension archive 
wget --header='Accept-Encoding:none' -O /tmp/extension.zip "${URL}" 

# Unzip extension to installation folder 
mkdir -p "${EXTENSION_PATH}/${EXTENSION_UUID}";
unzip -q /tmp/extension.zip -d ${EXTENSION_PATH}/${EXTENSION_UUID};
cp -r ${EXTENSION_PATH}/${EXTENSION_UUID}/cpufreq-${BRANCH}/* ${EXTENSION_PATH}/${EXTENSION_UUID};
rm -r ${EXTENSION_PATH}/${EXTENSION_UUID}/cpufreq-${BRANCH}

# List enabled extensions 
EXTENSION_LIST=$(gsettings get org.gnome.shell enabled-extensions | sed 's/^.\(.*\).$/\1/');

# Check if extension is already enabled
EXTENSION_ENABLED=$(echo ${EXTENSION_LIST} | grep ${EXTENSION_UUID});

if [ "$EXTENSION_ENABLED" = "" ]; then
  # Enable extension
  if [ "$XDG_CURRENT_DESKTOP" = "GNOME" ] || [ "$XDG_CURRENT_DESKTOP" = "UBUNTU:GNOME" ]; then
    gsettings set org.gnome.shell enabled-extensions "[${EXTENSION_LIST},'${EXTENSION_UUID}']" 
  fi
  # Extension is now available
  echo "Extension with ID ${EXTENSION_ID} has been enabled. Restart your desktop to take effect (Alt+F2 then 'r')." 
fi

# remove temporary files 
rm -f /tmp/extension.zip
