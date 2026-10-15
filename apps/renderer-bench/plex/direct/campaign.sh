#!/bin/bash
# Home Down/Up campaign: stock, compat (own) and direct, 5 rotating rounds at 1x and 4x.
cd "$(dirname "$0")"
OUT=${1:-results.jsonl}
load() { uptime | sed 's/.*load averages: //' | awk '{print $1}'; }
port() { case $1 in direct) echo 9500;; own) echo 9501;; stock) echo 9502;; esac; }
orders=("stock own direct" "own direct stock" "direct stock own" "stock direct own" "own stock direct")
for round in 1 2 3 4 5; do
  for th in 1 4; do
    for v in ${orders[$((round - 1))]}; do
      for attempt in 1 2 3; do
        for w in $(seq 40); do awk -v l="$(load)" 'BEGIN{exit !(l<20)}' && break; sleep 15; done
        line=$(CHROME_URL=http://127.0.0.1:$(port $v) timeout 280 node bench.mjs $v $th /dev/null 2>>campaign.err)
        if [ -z "$line" ]; then echo "fail $v $th r$round a$attempt" >> campaign.err; continue; fi
        echo "$line" | jq -c --arg r $round --arg a $attempt '. + {round: ($r|tonumber), attempt: ($a|tonumber)}' >> "$OUT"
        spike=$(echo "$line" | jq '[.load0,.load1] | max > 20')
        echo "r$round $th $v a$attempt spike=$spike $(echo "$line" | jq -c '[.load0,.load1]')"
        [ "$spike" = false ] && break
      done
    done
  done
done
echo campaign-done
