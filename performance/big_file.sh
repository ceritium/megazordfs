#!/bin/bash
set -x

VOLUME=$1

time dd if=/dev/urandom of=${VOLUME}/FOO bs=1m count=100
