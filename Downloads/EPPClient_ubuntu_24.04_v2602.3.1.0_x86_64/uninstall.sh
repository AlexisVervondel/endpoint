#!/bin/bash
#
# uninstall.sh
#
# Created on: 30 July 2021
# Target: Linux debian distros machines
# Version: without dependencies
#
# Endpoint Protector offers Data Loss Prevention for Windows, Mac and Linux, as well as
# Mobile Device Management for Android and iOS.
#

readonly _yellow_color="\e[1;33m"
readonly _red_color='\e[1;31m'
readonly _white_color='\e[1;37m'
readonly _default="\033[0m"

readonly _current_user="$(whoami)"
echo -e "${_white_color} The current user is ${_current_user}${_default}"

## Force the user to run the script with root privileges
if [[ "${_current_user}" != "root" ]]; then
	echo -e "${_yellow_color} This script needs root priviledges ${_default}"
    sudo "$0"
    exit $?
fi

readonly _epp_client_daemon=epp-client-daemon
readonly _epp_client_installed="$(dpkg -l | grep epp-client | awk '{print $3}' | head -1)"
readonly _option_ini_file="/opt/cososys/share/apps/epp-client/options.ini"
readonly _md5_set_entry="$(grep "protect=" ${_option_ini_file})"
readonly _md5_set_sum=${_md5_set_entry:8}

if [[ "${_md5_set_sum}" != "0" ]] && [[ -n "${_md5_set_entry}" ]]; then
    read -s -p "Input uninstall password:" _password
    _md5_check_sum=$(printf '%s' "ndJZGfM8Vx4493BRncVxAEx7rvVQSS2R" | md5sum | awk '{print $1}')
    if [[ "${_md5_set_sum}" == "${_md5_check_sum}" ]]; then
        echo -e "${_white_color}" "\nThe uninstall password is correct.\n${_default}"
    else
        echo -e "${_white_color}" "\nThe uninstall password is not correct.\n${_default}"
        exit
    fi
else
    echo -e "${_white_color}The uninstall password is not requested.\n${_default}"
fi

echo -e "${_yellow_color}Begin the epp-client uninstalling with prerequisite. ${_default}"

echo -e "${_yellow_color}Check if the epp-client is already installed on this machine. ${_default}"
if [ "${_epp_client_installed}" != "" ]; then
    echo "The epp-client is installed. Proceeding with uninstalling."

    _epp_client_daemon_pid="$(ps faux | grep '/opt/cososys/sbin/epp-client-daemon' | grep -vw grep)"
    _epp_client_daemon_pid="$(echo "${_epp_client_daemon_pid}" | awk '{ print $2 }')"
    if [ -n "${_epp_client_daemon_pid}" ]; then
        echo "Send the uninstall event to the server."
        kill -s SIGUSR2 "${_epp_client_daemon_pid}"
        for _ts in {01..05}; do
            sleep 1
            printf "\rwait: %s s" "${_ts}"
        done
        echo
    fi

    # make sure old packages are removed
    dpkg --purge epp-client-config || true
    dpkg --purge epp-client-cap-def || true
    dpkg --purge cososys-filesystem || true

    echo "Uninstalling the epp-client."
    dpkg --purge epp-client
    sh -c "yes | apt-get autoremove"
    rm -rf /etc/apt/trusted.gpg.d/cososys.asc

    echo -e "${_yellow_color}\nThe epp-client is successfully uninstalled.${_default}"
else
    echo -e "${_yellow_color}\nThe epp-client is not installed on this machine.${_default}"
fi

echo -e "${_default}"

exit
