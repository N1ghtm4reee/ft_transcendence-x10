#!/bin/bash


# this script send request to namescheap to update dns -> ip binding (dynamic dns)


HOST="@"
DOMAIN="your.domain"
PASSWORD="password_from_namescheap"

curl "https://dynamicdns.park-your-domain.com/update?host=${HOST}&domain=${DOMAIN}&password=${PASSWORD}"
