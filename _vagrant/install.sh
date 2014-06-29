#!/usr/bin/env bash

echo "set grub-pc/install_devices /dev/sda" | debconf-communicate
aptitude update
aptitude -y safe-upgrade
aptitude -y install python-software-properties

if [ ! -f /etc/apt/sources.list.d/chris-lea-node.js-raring.list ]
then
    add-apt-repository ppa:chris-lea/node.js
    aptitude update
fi

aptitude -y install nodejs git curl
npm install -g bower
