#!/bin/bash

current_time=$(date +%H:%M)
target_time="17:59"

while true; do
    current_time=$(date +%H:%M)
    if [ "$current_time" = "$target_time" ]; then
        say "18時の予定の準備をする時間です。1分後に予定が始まります。"
        break
    fi
    sleep 30
done 