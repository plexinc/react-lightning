#!/bin/bash
# Alternating stock/compat runs, throttles 4x and 6x, 5 rounds.
cd "$(dirname "$0")"
for round in 1 2 3 4 5; do
  for th in 4 6; do
    if [ $((round % 2)) -eq 0 ]; then order="stock compat"; else order="compat stock"; fi
    for v in $order; do
      timeout 240 node measure.mjs $v $th measure.jsonl > /dev/null 2>> campaign.err || echo "fail $v $th $round" >> campaign.err
    done
  done
done
echo done >> campaign.err
