#!/bin/bash
# Production builds: Home Down/Up and Home load, stock/compat/direct, 5 rotating rounds at 1x and 4x.
cd "$(dirname "$0")"
load() { uptime | sed 's/.*load averages: //' | awk '{print $1}'; }
port() { case $1 in direct) echo 9500;; own) echo 9501;; stock) echo 9502;; esac; }
origin() { case $1 in direct) echo http://localhost:3494;; own) echo http://localhost:3493;; stock) echo http://localhost:3492;; esac; }
orders=("stock own direct" "own direct stock" "direct stock own" "stock direct own" "own stock direct")
for round in 1 2 3 4 5; do
  for th in 1 4; do
    for v in ${orders[$((round - 1))]}; do
      for script in bench bench-load; do
        out=prod.jsonl; [ $script = bench-load ] && out=prod-load.jsonl
        for attempt in 1 2 3; do
          for w in $(seq 40); do awk -v l="$(load)" 'BEGIN{exit !(l<20)}' && break; sleep 15; done
          line=$(ORIGIN=$(origin $v) CHROME_URL=http://127.0.0.1:$(port $v) timeout 280 node $script.mjs $v $th /dev/null 2>>campaign-prod.err)
          if [ -z "$line" ]; then echo "fail $script $v $th r$round a$attempt" >> campaign-prod.err; continue; fi
          echo "$line" | jq -c --arg r $round --arg a $attempt '. + {round: ($r|tonumber), attempt: ($a|tonumber)}' >> "$out"
          spike=$(echo "$line" | jq '[.load0,.load1] | max > 20')
          echo "r$round $th $v $script a$attempt spike=$spike"
          [ "$spike" = false ] && break
        done
      done
    done
  done
done
echo campaign-done
