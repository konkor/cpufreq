#!/bin/bash

PKG_NAME="cpufreq"
VERSION=$(cat VERSION)

echo Version: $VERSION
rm -rf debs
mkdir debs
cd debs
ln -s ../../$PKG_NAME-$VERSION.tar.xz cpufreq_$VERSION.orig.tar.xz
tar xf cpufreq_$VERSION.orig.tar.xz
cd $PKG_NAME-$VERSION
cp -r ../../debian/ .
debuild -us -uc
