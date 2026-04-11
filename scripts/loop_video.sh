#!/bin/bash

# Usage:
# ./script.sh input.mp4 [output.mp4] [fade_seconds]

if [ -z "$1" ]; then
  echo "Usage: $0 input.mp4 [output.mp4] [fade_seconds]"
  exit 1
fi

INPUT="$1"
FADE_OVERRIDE="$3"

# Build default output path
DIR=$(dirname "$INPUT")
FILE=$(basename "$INPUT")
EXT="${FILE##*.}"
NAME="${FILE%.*}"

DEFAULT_OUTPUT="$DIR/${NAME}_looped.$EXT"
OUTPUT="${2:-$DEFAULT_OUTPUT}"

# Detect audio
HAS_AUDIO=$(ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$INPUT")

# Get duration
DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$INPUT")

# Default fade = 25%
FADE=$(awk "BEGIN {print $DURATION*(5/20)}")

# Override fade if provided
if [ -n "$FADE_OVERRIDE" ]; then
  FADE="$FADE_OVERRIDE"
fi

HALF=$(awk "BEGIN {print $DURATION/2}")

# Clamp fade
if (( $(awk "BEGIN {print ($FADE >= $HALF)}") )); then
  FADE=$(awk "BEGIN {print $HALF*0.9}")
  echo "Fade too large, clamped to $FADE seconds"
fi

OFFSET=$(awk "BEGIN {print $HALF-$FADE}")

# Build filter
if [ -n "$HAS_AUDIO" ]; then
  FILTER="
  [0:v]split=2[vA][vB];
  [0:a]asplit=2[aA][aB];
  [vA]trim=0:$HALF,setpts=PTS-STARTPTS[v1];
  [vB]trim=start=$HALF,setpts=PTS-STARTPTS[v2];
  [aA]atrim=0:$HALF,asetpts=PTS-STARTPTS[a1];
  [aB]atrim=start=$HALF,asetpts=PTS-STARTPTS[a2];
  [v2][v1]xfade=transition=fade:duration=$FADE:offset=$OFFSET[v];
  [a2][a1]acrossfade=d=$FADE[a]
  "
  MAP_AUDIO="-map [a]"
else
  echo "No audio stream detected → processing video only"
  FILTER="
  [0:v]split=2[vA][vB];
  [vA]trim=0:$HALF,setpts=PTS-STARTPTS[v1];
  [vB]trim=start=$HALF,setpts=PTS-STARTPTS[v2];
  [v2][v1]xfade=transition=fade:duration=$FADE:offset=$OFFSET[v]
  "
  MAP_AUDIO=""
fi

# Run ffmpeg
ffmpeg -i "$INPUT" -filter_complex "$FILTER" \
-map "[v]" $MAP_AUDIO \
-c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p \
-movflags +faststart "$OUTPUT"

echo "Output written to: $OUTPUT"