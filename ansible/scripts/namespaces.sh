#!/bin/bash

# create namespaces to add virtual cluster and add segregation
kubectl create namespace elk
kubectl create namespace app
kubectl create namespace monitor
