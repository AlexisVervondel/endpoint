#!/bin/bash
#
# install.sh
#
# Created on: 21 Feb 2020
# Target: Linux debian distros machines
# Version: without dependencies (THIN)
#
# Endpoint Protector offers Data Loss Prevention for Windows, Mac and Linux,
# as well as Mobile Device Management for Android and iOS.
#

readonly _yellow_color="\033[1;33m"
readonly _red_color='\033[1;31m'
readonly _white_color='\033[1;37m'
readonly _default="\033[0m"

# parse command line arguments
while test "$#" -gt 0; do
    case "$1" in
        "--cli") _cli="$1" ; shift ;;
        "-y"|"--yes") _y="$1" ; shift ;;
        *) shift ;;
	esac
done

readonly _current_user="$(whoami)"
echo -e "${_white_color} The current user is ${_current_user}${_default}"

readonly _epp_notifier=/opt/cososys/bin/epp-client
## Force the user to run the script with root privileges
if [[ "${_current_user}" != "root" ]]; then
	echo -e "${_yellow_color} This script needs root priviledges ${_default}"
	sudo "$0" "$_cli" "$_y"
	ret_val="$?"
	if [ -x "${_epp_notifier}" ] && xhost >/dev/null 2>&1 ; then
		nohup "${_epp_notifier}" >/dev/null 2>&1 &
	fi
	exit "${ret_val}"
fi

## Define variables used by install.sh script

readarray -t _OS_RELEASE < <(. /etc/os-release; printf "$ID\n$VERSION_ID\n")
_distro_id=${_OS_RELEASE[0]}
readonly _distro_id
_distro_version=${_OS_RELEASE[1]}
readonly _distro_version
readonly _arch="$(uname -m)"
readonly _path_installer="$(dirname "$0")"
readonly _epp_client_daemon=epp-client-daemon
readonly _packages_path="${_path_installer}/pkgs"
readonly _package_stats="$(dpkg-deb -I "${_packages_path}"/epp-client_*.deb)"
readonly _build_arch="$(echo "${_package_stats}" | grep Architecture | awk '{print $2}')"
readonly _dependencies_path="${_path_installer}/deps"
readonly _configuration_path=/opt/cososys/share/apps/epp-client
readonly _configuration_file=options.sh
readonly _check_eppclient_process_sh="/opt/cososys/check-eppclient-process.sh"
readonly _epp_client_status="$(dpkg -l | grep 'epp-client' | awk '{print $1}' | head -1)"
readonly _epp_client_file="/opt/cososys/bin/epp-client"
readonly _epp_client_png_file="/usr/share/pixmaps/epp-client.png"

## Begin to install packages for epp-client
echo
if [ "${_arch}" == "x86_64" ] && [ "${_build_arch}" == "amd64" ]; then
    echo -e "${_yellow_color} Installing x86_64 (64b) packages ${_default}"
else
    echo -e "${_red_color} Architecture ${_arch} not supported by this installer ${_default}"
	exit
fi

## Check if epp-client is installed
echo -e "${_yellow_color}\nCheck if the epp-client is already installed.${_default}"

if [ "${_epp_client_status}" == 'ii' ]; then

    echo -e "${_white_color}The epp-client is installed.${_default}"
    _installed_stats="$(dpkg -s epp-client)"
    _installed_version="$(echo "${_installed_stats}" | grep Version | cut -d: -f2 | xargs)"
    _package_version="$(echo "${_package_stats}" | grep Version | cut -d: -f2 | xargs)"
    echo -e "${_white_color}Installed version: ${_installed_version}${_default}"
    echo -e "${_white_color}Package version: ${_package_version}${_default}"
    if [ "${_installed_version}" = "${_package_version}" ]; then
        echo -e "${_yellow_color}The installed version and the package version are the same. Exiting...${_default}"
		exit 0
    fi
	if [ -z "$_y" ]; then
		echo -en "${_yellow_color}Install version ${_package_version} over ${_installed_version}? [Y/n] ${_default}"
		read -r response
		[ -n "${response}" ] && [ "${response}" != "Y" ] && exit 0
	fi
    echo -e "${_white_color}The epp-client is installed. Updating ...${_default}"
    _update=1
else
    echo -e "${_white_color}The epp-client is not installed on this machine.${_default}"
fi

## Begin to install dependencies
echo -e "${_yellow_color}\nBegin to install dependencies.${_default}"

_list_dependencies=" "
for _entry_list_dependencies in $(ls "${_dependencies_path}"); do
    _program_package=$(echo "${_entry_list_dependencies}" | sed 's/_[0-9].*//')
    if dpkg -s "${_program_package}" &>/dev/null; then
        echo -e "${_white_color}Package ${_program_package} is already installed.${_default}"
    else
        echo -e "${_white_color}Package ${_program_package} will be installed.${_default}"
        _new_list_dependencies="${_list_dependencies} ${_dependencies_path}/${_entry_list_dependencies}"
        _list_dependencies=${_new_list_dependencies}
    fi
done
if [ "${_list_dependencies}" == " " ]; then
    echo -e "${_white_color}All dependencies are already installed.${_default}"
    _dpkg_error=0
else
    echo -e "${_white_color}paths = ${_list_dependencies}${_default}"
	dpkg -i "${_dependencies_path}"/*.deb
    _dpkg_error=$?
fi

if [ ${_dpkg_error} -ne 0 ]; then
    echo -e "${_red_color}Error: installing epp packages. Exiting...${_default}"
    exit ${_dpkg_error}
fi

## The epp-client public key is added
echo -e "${_white_color}The epp-client public key is added.${_default}"
cp "${_path_installer}"/netwrixcorporation-pgp-signing.asc /etc/apt/trusted.gpg.d/netwrix.asc

echo -e "${_white_color}Changing config file to match IP/PORT/Department with provided values.${_default}"
echo -e "${_white_color}${_path_installer}/${_configuration_file}${_default}"
. "${_path_installer}/${_configuration_file}"

apt -f $_y install "${_packages_path}"/epp-client_*.deb
_exit_code=$?
if [ ${_exit_code} -ne 0 ]; then
    echo -e "${_red_color}Error: installing epp packages. Exiting...${_default}"
    exit ${_exit_code}
fi

echo
if [ -n "$_cli" ]; then
    rm "${_epp_client_file}" >/dev/null 2>&1 &
    rm "${_epp_client_png_file}" >/dev/null 2>&1 &
    echo -e "${_white_color}Removed notifier from system.\n${_default}"
    exit
fi

echo -e "${_yellow_color}The epp-client was successfully installed.${_default}"

## If the user is not root then the epp-client notifier is launched
echo
if [ -x "${_epp_notifier}" ] && [ "${EUID}" -ne 0 ]; then
    if xhost >/dev/null 2>&1 ; then
		echo -e "${_yellow_color}Activate the client notifier that can be accessed from system tray.${_default}"
		# put the epp-client notifier to run in backgroud and make the shell not wait for completion
		nohup "${_epp_notifier}" >/dev/null 2>&1 &
	else
		echo -e "${_yellow_color}To activate the client notifier on logged user please ${_default}"
		echo -e "${_yellow_color}open Activities and search for Endpoint Protector Notifier.${_default}"
	fi
fi

echo -e "${_default}"

exit
