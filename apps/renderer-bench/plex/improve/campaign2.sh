#!/bin/bash
# Alternating before (base) / after (own) / stock runs at 4x, 3 rounds: ./campaign2.sh out.jsonl
cd "$(dirname "$0")"
out=$1
for round in 1 2 3; do
  if [ $((round % 2)) -eq 0 ]; then order="own base stock"; else order="base own stock"; fi
  for v in $order; do
    timeout 240 node measure2.mjs $v 4 "$out" > /dev/null 2>> "$out.err" || echo "fail $v $round" >> "$out.err"
  done
done
echo done >> "$out.err"
